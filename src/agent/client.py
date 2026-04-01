"""Agent 客户端封装

提供流式对话能力，支持自定义安全工具
"""

import logging
from typing import AsyncGenerator, Optional
from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    CLINotFoundError,
    CLIConnectionError
)

from src.agent.config import get_agent_config
from src.agent.tools import security_tools

logger = logging.getLogger(__name__)


class AgentClient:
    """Agent 客户端封装类

    使用 ClaudeSDKClient 提供流式对话能力
    """

    def __init__(self, user_id: str):
        """初始化 Agent 客户端

        Args:
            user_id: 用户ID，用于沙箱隔离
        """
        self.user_id = user_id
        self.client: Optional[ClaudeSDKClient] = None
        self._config = get_agent_config(user_id)

    async def query(self, message: str) -> AsyncGenerator[dict, None]:
        """发送查询并返回流式响应

        Args:
            message: 用户消息

        Yields:
            dict: 包含 type 和 content 的消息字典
        """
        try:
            # 构建 ClaudeAgentOptions
            options = ClaudeAgentOptions(
                system_prompt=self._config["system_prompt"],
                allowed_tools=self._config["allowed_tools"],
                permission_mode=self._config["permission_mode"],
                cwd=self._config["cwd"],
                max_steps=self._config.get("max_steps", 10),
                mcp_servers={"security": security_tools},
                env=self._config.get("env", {})
            )

            self.client = ClaudeSDKClient(options=options)

            async with self.client:
                # 发送查询
                await self.client.query(message)

                # 流式接收响应
                async for msg in self.client.receive_response():
                    # 处理不同消息类型
                    msg_type = getattr(msg, 'type', 'unknown')

                    if msg_type == 'assistant_message' or msg_type == 'text':
                        content = getattr(msg, 'text', '') or ''
                        for block in getattr(msg, 'content', []):
                            if hasattr(block, 'text'):
                                content += block.text
                        if content:
                            yield {"type": "text", "content": content}

                    elif msg_type == 'tool_use':
                        tool_name = getattr(msg, 'tool_name', 'unknown')
                        yield {"type": "tool_use", "content": f"正在执行: {tool_name}"}

                    elif msg_type == 'tool_result':
                        yield {"type": "tool_result", "content": "工具执行完成"}

                    elif msg_type == 'error':
                        error_msg = getattr(msg, 'error', str(msg))
                        yield {"type": "error", "content": str(error_msg)}

        except CLINotFoundError as e:
            logger.error(f"Claude SDK 未找到: {e}")
            yield {"type": "error", "content": f"Claude SDK 未找到: {e}"}
            yield {"type": "fallback_required", "content": ""}

        except CLIConnectionError as e:
            logger.error(f"Claude SDK 连接失败: {e}")
            yield {"type": "error", "content": f"连接失败: {e}"}
            yield {"type": "fallback_required", "content": ""}

        except Exception as e:
            logger.exception(f"Agent 查询异常: {e}")
            yield {"type": "error", "content": f"查询异常: {e}"}
            yield {"type": "fallback_required", "content": ""}

    async def close(self):
        """关闭客户端连接"""
        if self.client:
            self.client = None


async def create_agent_client(user_id: str) -> AgentClient:
    """创建 Agent 客户端的工厂函数

    Args:
        user_id: 用户ID

    Returns:
        AgentClient 实例
    """
    return AgentClient(user_id)