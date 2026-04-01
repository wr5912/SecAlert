"""Agent 客户端测试"""

import pytest
import sys
import asyncio
import importlib
from unittest.mock import MagicMock, patch

# 确保 mock 已设置 (由 conftest.py 设置)
import claude_agent_sdk

# 重新加载 client 模块以确保使用 mock
import src.agent.client
importlib.reload(src.agent.client)

# 导入被测试的模块
from src.agent.client import AgentClient, create_agent_client
from src.agent.config import get_agent_config


@pytest.mark.asyncio
async def test_create_agent_client():
    """验证 create_agent_client 工厂函数"""
    client = await create_agent_client("test-user-001")
    assert isinstance(client, AgentClient)
    assert client.user_id == "test-user-001"


def test_agent_client_config():
    """验证客户端配置正确"""
    client = AgentClient("test-user-001")
    config = client._config

    assert config["permission_mode"] == "acceptEdits"
    assert "test-user-001" in config["cwd"]
    assert "system_prompt" in config
    assert "allowed_tools" in config


def test_client_has_query_method():
    """验证 query 方法存在"""
    client = AgentClient("test-user-001")
    assert hasattr(client, "query")
    # query 是 async 方法
    import inspect
    # 检查是否是协程函数 (通过检查其 __call__ 或直接检查类定义)
    assert inspect.isasyncgenfunction(AgentClient.query) or \
           hasattr(client.query, '__await__')


def test_client_has_close_method():
    """验证 close 方法存在"""
    client = AgentClient("test-user-001")
    assert hasattr(client, "close")
    import inspect
    assert inspect.iscoroutinefunction(AgentClient.close)


def test_allowed_tools_includes_security_tools():
    """验证 allowed_tools 包含安全工具"""
    config = get_agent_config("test-user")
    allowed = config["allowed_tools"]

    assert "mcp__security__query_alerts" in allowed
    assert "mcp__security__analyze_chain" in allowed
    # permission_mode 应该包含 acceptEdits
    assert "acceptEdits" in config.get("permission_mode", "")


def test_max_steps_configured():
    """验证 max_steps 配置"""
    config = get_agent_config("test-user")
    assert config.get("max_steps") == 10
