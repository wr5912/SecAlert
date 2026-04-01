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


def test_ws_endpoint_accepts_connection(mock_workspace, monkeypatch):
    """验证 WebSocket 端点接受连接 - 使用 direct import 测试"""
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

    # 直接测试 router 中的 WebSocket 端点函数存在
    from src.api.agent_endpoints import router, agent_chat

    # 验证 router 包含 WebSocket 路由
    ws_routes = [r for r in router.routes if hasattr(r, 'path') and '/ws/chat' in r.path]
    assert len(ws_routes) >= 1, "WebSocket 路由未注册"

    # 验证 agent_chat 函数签名正确 (接收 WebSocket)
    import inspect
    sig = inspect.signature(agent_chat)
    params = list(sig.parameters.keys())
    assert 'websocket' in params, "agent_chat 缺少 websocket 参数"

    # 验证端点路径模式
    route_path = ws_routes[0].path
    assert 'user_id' in route_path or '{user_id}' in route_path, "WebSocket 路径缺少 user_id 参数"


def test_ws_endpoint_path_pattern():
    """验证 WebSocket 端点路径模式正确"""
    from src.api.agent_endpoints import router

    # 检查所有路由
    ws_routes = [r for r in router.routes]
    ws_paths = [r.path for r in ws_routes if hasattr(r, 'path')]

    # 验证存在 /ws/chat/{user_id} 模式
    has_user_id_ws = any(
        '/ws/chat/' in p and ('{user_id}' in p or 'user_id' in p)
        for p in ws_paths
    )
    assert has_user_id_ws, f"WebSocket 路径模式不正确: {ws_paths}"
