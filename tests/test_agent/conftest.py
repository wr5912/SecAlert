"""Agent 测试共享 fixtures"""

import pytest
import asyncio
from typing import Generator

# pytest-asyncio 配置
pytest_plugins = ('pytest_asyncio',)


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
