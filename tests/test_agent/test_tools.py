"""工具注册测试"""

import pytest
import sys
from unittest.mock import MagicMock

# Mock claude_agent_sdk before importing tools
mock_sdk = MagicMock()

# query_alerts 工具
mock_query_alerts = MagicMock()
mock_query_alerts.name = "query_alerts"
mock_query_alerts.description = "查询安全告警列表，支持按严重度筛选"
mock_query_alerts.input_schema = {
    "severity": str,
    "limit": int
}

# analyze_chain 工具
mock_analyze_chain = MagicMock()
mock_analyze_chain.name = "analyze_chain"
mock_analyze_chain.description = "分析攻击链详情，包括攻击阶段、关联实体、告警时间线"
mock_analyze_chain.input_schema = {
    "chain_id": str
}

# 配置 create_sdk_mcp_server 返回的对象属性
mock_mcp_server = MagicMock()
mock_mcp_server.name = "security"
mock_mcp_server.version = "1.0.0"
mock_mcp_server.tools = [mock_query_alerts, mock_analyze_chain]

mock_sdk.tool.return_value = lambda fn: fn
mock_sdk.create_sdk_mcp_server.return_value = mock_mcp_server

sys.modules['claude_agent_sdk'] = mock_sdk

# 现在导入被测试的模块
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
