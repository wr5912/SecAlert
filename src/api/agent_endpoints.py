"""
Agent WebSocket 端点

提供:
- WebSocket /ws/chat/{user_id} - Agent 流式对话
"""

import os
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from src.agent.client import create_agent_client
from src.agent.config import SYSTEM_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["agent"])

# 请求模型
class AgentMessage(BaseModel):
    message: str
    context: Optional[dict] = None


async def call_deepseek_fallback(
    system_prompt: str,
    user_message: str
) -> str:
    """Fallback 到 DeepSeek API

    当 Claude SDK 不可用时使用
    """
    import httpx

    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    if not api_key:
        return "错误: 未配置 DeepSeek API Key"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    "stream": False
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "无响应")
    except httpx.HTTPError as e:
        return f"DeepSeek API 调用失败: {str(e)}"


@router.websocket("/chat/{user_id}")
async def agent_chat(websocket: WebSocket, user_id: str):
    """Agent 流式对话 WebSocket 端点

    连接协议:
    1. 客户端发送 JSON: {"message": "...", "context": {...}}
    2. 服务端发送 JSON: {"type": "text"|"tool_use"|"done"|"error", "content": "..."}
    3. 断开连接时清理资源
    """
    await websocket.accept()
    logger.info(f"用户 {user_id} 连接到 Agent WebSocket")

    # 创建用户沙箱目录
    workspace = f"./workspaces/{user_id}"
    os.makedirs(workspace, exist_ok=True)

    client = None
    try:
        # 创建 Agent 客户端
        client = await create_agent_client(user_id)

        while True:
            # 接收消息
            try:
                data = await websocket.receive_text()
                msg_dict = json.loads(data)
                user_message = msg_dict.get("message", "")
                context = msg_dict.get("context", {})

                if not user_message:
                    continue

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "content": "无效的 JSON 格式"
                })
                continue

            # 构建系统提示 (包含上下文)
            system_prompt = SYSTEM_PROMPT
            if context:
                ctx_parts = []
                if context.get("type"):
                    ctx_parts.append(f"页面类型: {context['type']}")
                if context.get("chain_id"):
                    ctx_parts.append(f"攻击链ID: {context['chain_id']}")
                if context.get("asset_ip"):
                    ctx_parts.append(f"目标资产: {context['asset_ip']}")
                if ctx_parts:
                    system_prompt = f"{SYSTEM_PROMPT}\n\n当前上下文:\n" + "\n".join(f"- {c}" for c in ctx_parts)

            # 使用 Agent 查询
            fallback_triggered = False
            async for response in client.query(user_message):
                msg_type = response.get("type", "")
                content = response.get("content", "")

                # 检查是否需要 fallback
                if msg_type == "fallback_required":
                    fallback_triggered = True
                    break

                # 发送响应
                await websocket.send_json({
                    "type": msg_type,
                    "content": content
                })

            # 如果需要 fallback
            if fallback_triggered:
                logger.info(f"用户 {user_id}: SDK 失败，触发 DeepSeek Fallback")
                fallback_response = await call_deepseek_fallback(
                    system_prompt,
                    user_message
                )

                # 流式发送 fallback 响应
                for i in range(0, len(fallback_response), 10):
                    chunk = fallback_response[i:i+10]
                    await websocket.send_json({
                        "type": "text",
                        "content": chunk
                    })

            # 发送完成信号
            await websocket.send_json({"type": "done", "content": ""})

    except WebSocketDisconnect:
        logger.info(f"用户 {user_id} 断开连接")
    except Exception as e:
        logger.exception(f"WebSocket 异常: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"服务端异常: {str(e)}"
            })
        except:
            pass
    finally:
        # 清理资源
        if client:
            await client.close()
        logger.info(f"用户 {user_id} 会话结束")