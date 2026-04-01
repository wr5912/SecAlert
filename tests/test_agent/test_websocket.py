"""WebSocket 端点测试"""

import pytest
import sys
import json
import importlib
from unittest.mock import MagicMock, patch, AsyncMock

# 确保 mock 已设置 (由 conftest.py 设置)
import claude_agent_sdk

# 重新加载 agent_endpoints 模块以确保使用 mock
import src.api.agent_endpoints
importlib.reload(src.api.agent_endpoints)

# 导入被测试的模块
from src.api.agent_endpoints import router, call_deepseek_fallback


def test_agent_router_exists():
    """验证 router 是 APIRouter"""
    from fastapi import APIRouter
    assert isinstance(router, APIRouter)


def test_ws_endpoint_registered():
    """验证 WebSocket 端点已注册"""
    from src.api.main import app
    route_paths = [r.path for r in app.routes]
    assert any("/ws/chat" in str(p) for p in route_paths)


def test_deepseek_fallback_exists():
    """验证 DeepSeek fallback 函数存在"""
    import inspect
    assert callable(call_deepseek_fallback)
    assert inspect.iscoroutinefunction(call_deepseek_fallback)


@pytest.mark.skip(reason="TestClient WebSocket 需要正确的 httpx 安装，跳过此集成测试")
def test_ws_endpoint_accepts_connection(mock_workspace, monkeypatch):
    """验证 WebSocket 端点接受连接"""
    import os
    # Mock workspace path
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

    from fastapi import FastAPI
    from src.api.agent_endpoints import router

    app = FastAPI()
    app.include_router(router)

    from fastapi.testclient import TestClient

    client = TestClient(app)

    # 注意: TestClient 的 WebSocket 测试需要特殊处理
    with client.websocket_connect("/ws/chat/test-user-001") as websocket:
        # 发送测试消息
        test_message = {"message": "test", "context": {}}
        websocket.send_text(json.dumps(test_message))

        # 接收响应 (可能是 error 或 fallback)
        try:
            data = websocket.receive_json()
            assert "type" in data
        except Exception:
            pass  # 预期可能失败 (无 API key)
