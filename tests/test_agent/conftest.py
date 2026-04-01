"""Agent 测试共享 fixtures"""

import pytest
import asyncio
import sys
from typing import Generator
from unittest.mock import MagicMock

# pytest-asyncio 配置
pytest_plugins = ('pytest_asyncio',)

# 在导入任何被测模块之前设置 mock
_mock_sdk = MagicMock()

# query_alerts 工具
_mock_query_alerts = MagicMock()
_mock_query_alerts.name = "query_alerts"
_mock_query_alerts.description = "查询安全告警列表，支持按严重度筛选"
_mock_query_alerts.input_schema = {
    "severity": str,
    "limit": int
}

# analyze_chain 工具
_mock_analyze_chain = MagicMock()
_mock_analyze_chain.name = "analyze_chain"
_mock_analyze_chain.description = "分析攻击链详情，包括攻击阶段、关联实体、告警时间线"
_mock_analyze_chain.input_schema = {
    "chain_id": str
}

# 配置 create_sdk_mcp_server 返回的对象属性
_mock_mcp_server = MagicMock()
_mock_mcp_server.name = "security"
_mock_mcp_server.version = "1.0.0"
_mock_mcp_server.tools = [_mock_query_alerts, _mock_analyze_chain]

_mock_sdk.tool.return_value = lambda fn: fn
_mock_sdk.create_sdk_mcp_server.return_value = _mock_mcp_server
_mock_sdk.CLINotFoundError = Exception
_mock_sdk.CLIConnectionError = Exception
_mock_sdk.ClaudeAgentOptions.return_value = MagicMock()
_mock_sdk.ClaudeSDKClient.return_value = MagicMock()

# 设置 sys.modules 中的 mock
sys.modules['claude_agent_sdk'] = _mock_sdk


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """创建事件循环供所有测试使用"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def api_base_url() -> str:
    """API 基础 URL"""
    return "http://localhost:8000"


@pytest.fixture
def test_user_id() -> str:
    """测试用户 ID"""
    return "test-user-001"


@pytest.fixture
def mock_workspace(tmp_path) -> str:
    """创建临时工作空间目录"""
    workspace = tmp_path / "workspaces" / "test-user"
    workspace.mkdir(parents=True, exist_ok=True)
    return str(workspace)
