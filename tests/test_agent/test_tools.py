"""工具注册测试"""

import pytest
import sys
import importlib
from unittest.mock import MagicMock

# 确保 mock 已设置 (由 conftest.py 设置)
import claude_agent_sdk

# 重新加载 tools 模块以确保使用 mock
import src.agent.tools
importlib.reload(src.agent.tools)

from src.agent.tools import security_tools, query_alerts, analyze_chain


def test_security_tools_server_exists():
    """验证 security_tools MCP server 存在"""
    assert security_tools is not None
    assert security_tools.name == "security"
    assert security_tools.version == "1.0.0"


def test_query_alerts_tool_exists():
    """验证 query_alerts 工具已注册"""
    tool_names = [t.name for t in security_tools.tools]
    assert "query_alerts" in tool_names


def test_analyze_chain_tool_exists():
    """验证 analyze_chain 工具已注册"""
    tool_names = [t.name for t in security_tools.tools]
    assert "analyze_chain" in tool_names


def test_tool_count():
    """验证工具数量"""
    assert len(security_tools.tools) >= 2


def test_query_alerts_signature():
    """验证 query_alerts 工具签名"""
    assert callable(query_alerts)
    assert query_alerts.__name__ == "query_alerts"


def test_analyze_chain_signature():
    """验证 analyze_chain 工具签名"""
    assert callable(analyze_chain)
    assert analyze_chain.__name__ == "analyze_chain"
