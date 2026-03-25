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
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import uuid
import json
import os
import re
import httpx
from urllib.parse import urlencode

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

# ========== NL 查询意图识别 ==========

INTENT_PATTERNS = [
    {
        "intent": "query_alerts",
        "patterns": [
            "查询告警", "有哪些告警", "show me alerts",
            "查询", "搜索告警", "找找告警",
            "最近.*告警", ".*告警.*", "alerts"
        ],
        "api": "/api/chains",
        "api_type": "list"
    },
    {
        "intent": "explain_chain",
        "patterns": [
            "解释这个", "攻击链是什么", "what happened",
            "说明", "这是什么", "详情", "details"
        ],
        "api": "/api/chains/{chain_id}",
        "api_type": "detail"
    },
    {
        "intent": "get_recommendation",
        "patterns": [
            "怎么处理", "建议", "how to handle",
            "处置", "如何处理", "recommend", "处理建议"
        ],
        "api": "/api/remediation/chains/{chain_id}",
        "api_type": "remediation"
    },
    {
        "intent": "general_chat",
        "patterns": [],
        "api": None,
        "api_type": None
    }
]


def detect_intent(message: str) -> Tuple[str, Optional[Dict[str, Any]]]:
    """检测用户消息的意图

    Returns:
        (intent_name, extracted_params)
    """
    message_lower = message.lower()

    for pattern_config in INTENT_PATTERNS:
        for pattern in pattern_config["patterns"]:
            if re.search(pattern, message_lower, re.IGNORECASE):
                params = extract_intent_params(message, pattern_config["intent"])
                return pattern_config["intent"], params

    return "general_chat", None


def extract_intent_params(message: str, intent: str) -> Dict[str, Any]:
    """从用户消息中提取意图相关参数

    Args:
        message: 用户原始消息
        intent: 识别的意图类型

    Returns:
        提取的参数字典
    """
    params: Dict[str, Any] = {}

    # 提取严重度
    severity_match = re.search(
        r"(critical|high|medium|low|严重|中|低)",
        message,
        re.IGNORECASE
    )
    if severity_match:
        severity_map = {
            "critical": "critical", "严重": "critical",
            "high": "high", "高": "high",
            "medium": "medium", "中": "medium",
            "low": "low", "低": "low"
        }
        matched = severity_match.group(1).lower()
        params["severity"] = severity_map.get(matched, matched)

    # 提取时间范围
    time_patterns = [
        (r"最近(\d+)小时", "hours"),
        (r"最近(\d+)天", "days"),
        (r"最近(\d+)分钟", "minutes"),
        (r"今天", "today"),
        (r"昨天", "yesterday"),
        (r"这周", "this_week")
    ]
    for pattern, unit in time_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            if unit in ["hours", "days", "minutes"]:
                params["time_range"] = f"{match.group(1)}{unit}"
            else:
                params["time_range"] = unit
            break

    # 提取数量限制
    limit_match = re.search(r"(\d+)条|前(\d+)个|最多(\d+)", message)
    if limit_match:
        for g in limit_match.groups():
            if g:
                params["limit"] = int(g)
                break

    return params


async def call_chain_api(
    params: Dict[str, Any],
    chain_id: Optional[str] = None,
    api_type: str = "list"
) -> Dict[str, Any]:
    """调用 /api/chains 相关端点

    Args:
        params: 查询参数
        chain_id: 攻击链ID (用于详情/处置建议)
        api_type: list | detail | remediation

    Returns:
        API 响应数据
    """
    base_url = os.environ.get("API_BASE_URL", "http://localhost:8000")

    if api_type == "list":
        # 列表查询
        query_params = {
            "limit": params.get("limit", 10),
            "status": params.get("status", "active")
        }
        if params.get("severity"):
            query_params["severity"] = params["severity"]

        url = f"{base_url}/api/chains?{urlencode(query_params)}"

    elif api_type == "detail":
        # 详情查询
        if not chain_id:
            return {"error": "需要 chain_id"}
        url = f"{base_url}/api/chains/{chain_id}"

    elif api_type == "remediation":
        # 处置建议
        if not chain_id:
            return {"error": "需要 chain_id"}
        url = f"{base_url}/api/remediation/chains/{chain_id}"

    else:
        return {"error": f"未知的 api_type: {api_type}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        return {"error": f"API 调用失败: {str(e)}"}


def format_alerts_response(data: Dict[str, Any], params: Dict[str, Any]) -> str:
    """格式化告警列表响应为自然语言

    Args:
        data: API 返回的数据
        params: 原始查询参数

    Returns:
        格式化的自然语言响应
    """
    chains = data.get("chains", [])
    total = data.get("total", len(chains))

    if not chains:
        return "没有找到符合条件的告警。"

    # 构建响应
    severity_filter = params.get("severity", "全部")
    time_range = params.get("time_range", "所有时间")

    response = f"找到 {total} 条符合条件的告警（严重度: {severity_filter}，时间: {time_range}）：\n\n"

    for i, chain in enumerate(chains[:5], 1):  # 最多显示5条
        severity = chain.get("max_severity", "unknown").upper()
        asset_ip = chain.get("asset_ip", "未知")
        alert_count = chain.get("alert_count", 0)
        start_time = chain.get("start_time", "")[:16] if chain.get("start_time") else "未知"

        # 获取第一条告警的签名
        alerts = chain.get("alerts", [])
        first_alert = alerts[0] if alerts else {}
        signature = first_alert.get("alert_signature", "未知行为")

        response += f"{i}. [{severity}] {asset_ip}\n"
        response += f"   行为: {signature}\n"
        response += f"   告警数: {alert_count}，时间: {start_time}\n\n"

    if total > 5:
        response += f"... 还有 {total - 5} 条告警未显示"

    return response


def format_chain_detail_response(data: Dict[str, Any]) -> str:
    """格式化攻击链详情为自然语言"""
    chain_id = data.get("chain_id", "未知")
    severity = data.get("max_severity", "unknown").upper()
    status = data.get("status", "unknown")
    asset_ip = data.get("asset_ip", "未知")
    alert_count = data.get("alert_count", 0)

    response = f"**攻击链 {chain_id[:8]}... 详情**\n\n"
    response += f"- 严重度: {severity}\n"
    response += f"- 状态: {status}\n"
    response += f"- 目标资产: {asset_ip}\n"
    response += f"- 关联告警数: {alert_count}\n\n"

    # 告警列表
    alerts = data.get("alerts", [])
    if alerts:
        response += "**关联告警:**\n"
        for alert in alerts[:5]:  # 最多显示5条
            src_ip = alert.get("src_ip", "未知")
            sig = alert.get("alert_signature", "未知")
            timestamp = alert.get("timestamp", "")[:16] if alert.get("timestamp") else "未知"
            response += f"- [{timestamp}] {src_ip}: {sig}\n"

    return response


def format_remediation_response(data: Dict[str, Any]) -> str:
    """格式化处置建议为自然语言"""
    chain_id = data.get("chain_id", "未知")
    severity = data.get("severity", "unknown").upper()

    response = f"**攻击链 {chain_id[:8]}... 处置建议**\n\n"
    response += f"严重度: {severity}\n\n"

    recommendation = data.get("recommendation", {})
    if recommendation:
        response += f"**建议动作**: {recommendation.get('short_action', 'N/A')}\n\n"

        steps = recommendation.get("detailed_steps", [])
        if steps:
            response += "**详细步骤**:\n"
            for i, step in enumerate(steps, 1):
                response += f"{i}. {step}\n"

        response += f"\n**ATT&CK 技术**: {recommendation.get('attck_ref', 'N/A')}\n"

    timeline = data.get("timeline", {})
    if timeline:
        response += "\n**攻击时间线**:\n"
        summary = timeline.get("summary", "")
        if summary:
            response += f"{summary}\n"

    return response

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

        # 2. 检测意图
        intent, extracted_params = detect_intent(request.message)

        # 3. 根据意图处理
        if intent in ["query_alerts", "explain_chain", "get_recommendation"]:
            # 合并上下文参数和提取的参数
            merged_params = {**context_dict, **extracted_params} if extracted_params else context_dict

            # 确定 chain_id
            chain_id = merged_params.get("chain_id") or request.context.chain_id

            # 调用对应的 API
            if intent == "query_alerts":
                api_response = await call_chain_api(merged_params, api_type="list")
                if "error" in api_response:
                    response_text = api_response["error"]
                else:
                    response_text = format_alerts_response(api_response, merged_params)

            elif intent == "explain_chain":
                api_response = await call_chain_api(merged_params, chain_id=chain_id, api_type="detail")
                if "error" in api_response:
                    response_text = api_response["error"]
                else:
                    response_text = format_chain_detail_response(api_response)

            elif intent == "get_recommendation":
                if not chain_id:
                    response_text = "需要指定攻击链才能获取处置建议。请先选择一个告警。"
                else:
                    api_response = await call_chain_api(merged_params, chain_id=chain_id, api_type="remediation")
                    if "error" in api_response:
                        response_text = api_response["error"]
                    else:
                        response_text = format_remediation_response(api_response)

            # 流式输出
            for chunk in split_into_chunks(response_text):
                yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

        else:
            # 通用对话，使用 LLM
            system_prompt = build_system_prompt(request.context)
            full_prompt = f"{system_prompt}\n\n用户: {request.message}\n\n助手:"

            try:
                from src.analysis.remediation import RemediationAdvisor
                advisor = RemediationAdvisor()

                if request.context.chain_id:
                    # 需要先获取完整的 chain_data 才能调用 get_recommendation
                    chain_data = await call_chain_api({}, chain_id=request.context.chain_id, api_type="detail")
                    if "error" in chain_data:
                        response_text = chain_data["error"]
                    else:
                        recommendation = advisor.get_recommendation(chain_data)
                        response_text = f"根据当前上下文，我为您生成以下处置建议：\n\n"
                        response_text += f"**处置动作**: {recommendation.get('short_action', '查看详情')}\n\n"

                        if recommendation.get('detailed_steps'):
                            response_text += "**详细步骤**:\n"
                            for i, step in enumerate(recommendation['detailed_steps'], 1):
                                response_text += f"{i}. {step}\n"

                        response_text += f"\n**ATT&CK**: {recommendation.get('attck_ref', 'N/A')}"
                else:
                    response_text = "我目前显示的是全局上下文。如果您想获取具体的告警处置建议，请先选择一个告警或在告警列表页面与我对话。"

                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

            except Exception as e:
                error_msg = f"生成响应时出错: {str(e)}"
                for chunk in split_into_chunks(error_msg):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'error'})}\n\n"

        # 4. 标记结束
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
