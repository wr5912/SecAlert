"""
AI 助手对话 API 端点

提供:
- POST /api/chat/sessions - 创建新会话
- POST /api/chat/stream - 流式对话响应 (SSE)
- GET /api/chat/sessions/{session_id}/history - 获取历史消息
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ========== 数据模型 ==========

class ChatContext(BaseModel):
    """对话上下文模型"""
    type: str = Field(default="global", pattern="^(chain|list|dashboard|global)$")
    chain_id: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    asset_ip: Optional[str] = None
    alert_count: Optional[int] = None
    time_range: Optional[str] = None

class ChatMessage(BaseModel):
    """对话消息模型"""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    context_snapshot: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    context_type: str = Field(default="global", pattern="^(chain|list|dashboard|global)$")
    context_entity_id: Optional[str] = None

class CreateSessionResponse(BaseModel):
    """创建会话响应"""
    session_id: str
    context_type: str

class StreamRequest(BaseModel):
    """流式对话请求"""
    message: str
    session_id: str
    context: ChatContext

# ========== System Prompt 模板 ==========

SYSTEM_PROMPT_TEMPLATE = """你是 SecAlert 安全分析助手，帮助运维人员理解和处置安全告警。

当前上下文：
- 页面类型: {context_type}
{context_chain_id f'- 攻击链ID: {context_chain_id}' if context_chain_id else ''}
{context_severity f'- 严重度: {context_severity}' if context_severity else ''}
{context_alert_count f'- 告警数量: {context_alert_count}' if context_alert_count else ''}
{context_asset_ip f'- 目标资产: {context_asset_ip}' if context_asset_ip else ''}

规则：
1. 只读取当前上下文中的信息，禁止自行查询数据库
2. 回答必须基于上述上下文，禁止编造信息
3. 如需查询更多信息，建议用户使用搜索功能
4. 处置建议必须包含具体的操作步骤
5. 如果上下文信息不足，明确告知用户需要先选择告警或查看告警列表
"""

# ========== 内存存储 (生产环境应使用PostgreSQL) ==========

_sessions: Dict[str, Dict[str, Any]] = {}
_messages: Dict[str, List[Dict[str, Any]]] = {}

def save_message(session_id: str, role: str, content: str, context: Optional[Dict[str, Any]] = None):
    """保存消息到存储"""
    if session_id not in _messages:
        _messages[session_id] = []
    _messages[session_id].append({
        "message_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": role,
        "content": content,
        "context_snapshot": context,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

def build_system_prompt(context: ChatContext) -> str:
    """构建System Prompt"""
    return SYSTEM_PROMPT_TEMPLATE.format(
        context_type=context.type,
        context_chain_id=context.chain_id or "",
        context_severity=context.severity or "",
        context_alert_count=context.alert_count or "",
        context_asset_ip=context.asset_ip or ""
    )

# ========== API 端点 ==========

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """创建新对话会话"""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "user_id": "default_user",
        "context_type": request.context_type,
        "context_entity_id": request.context_entity_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _messages[session_id] = []
    return CreateSessionResponse(
        session_id=session_id,
        context_type=request.context_type
    )

@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    limit: int = Query(default=20, ge=1, le=100)
):
    """获取对话历史"""
    if session_id not in _messages:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = _messages[session_id][-limit:]
    return {"session_id": session_id, "messages": messages}

@router.post("/stream")
async def chat_stream(request: StreamRequest):
    """流式 AI 对话响应 (SSE)

    请求体:
    {
        "message": "这条告警怎么处理？",
        "session_id": "uuid",
        "context": {"type": "chain", "chain_id": "abc123"}
    }
    """
    async def generate():
        # 1. 保存用户消息
        context_dict = request.context.model_dump() if request.context else {}
        save_message(request.session_id, "user", request.message, context_dict)

        # 2. 构建 Prompt
        system_prompt = build_system_prompt(request.context)
        full_prompt = f"{system_prompt}\n\n用户: {request.message}\n\n助手:"

        # 3. 调用 LLM 流式生成 (使用 vLLM 或 DSPy)
        # 这里使用模拟流式响应作为演示
        try:
            # 尝试调用已有的 RemediationAdvisor
            from src.analysis.remediation import RemediationAdvisor
            advisor = RemediationAdvisor()

            # 如果有 chain_id，生成处置建议
            if request.context.chain_id:
                chain_id = request.context.chain_id
                # 模拟流式输出
                response_text = f"正在查询攻击链 {chain_id} 的处置建议..."

                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

                # 调用真实建议生成
                recommendation = advisor.get_recommendation(chain_id)
                response_text = f"根据分析，针对此攻击链的建议如下：\n\n"
                response_text += f"**处置动作**: {recommendation.get('short_action', '查看详情')}\n\n"

                if recommendation.get('detailed_steps'):
                    response_text += "**详细步骤**:\n"
                    for i, step in enumerate(recommendation['detailed_steps'], 1):
                        response_text += f"{i}. {step}\n"

                response_text += f"\n**ATT&CK**: {recommendation.get('attck_ref', 'N/A')}"

                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"
            else:
                # 通用对话
                response_text = "我目前显示的是全局上下文。如果您想获取具体的告警处置建议，请先选择一个告警或在告警列表页面与我对话。"
                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

        except Exception as e:
            error_msg = f"生成响应时出错: {str(e)}"
            for chunk in split_into_chunks(error_msg):
                yield f"data: {json.dumps({'token': chunk, 'type': 'error'})}\n\n"

        # 4. 保存助手消息 (存储完整响应)
        save_message(request.session_id, "assistant", "[已生成响应]", context_dict)

        # 5. 标记结束
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    def split_into_chunks(text: str, chunk_size: int = 10):
        """将文本拆分为小块用于流式输出"""
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/sessions")
async def list_sessions():
    """列出所有会话 (调试用)"""
    return {"sessions": list(_sessions.values())}
