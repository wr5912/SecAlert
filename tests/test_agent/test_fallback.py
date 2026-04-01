"""Fallback 机制测试"""

import pytest
import sys
import importlib
from unittest.mock import patch, AsyncMock, MagicMock

# 确保 mock 已设置 (由 conftest.py 设置)
import claude_agent_sdk

# 重新加载 agent_endpoints 模块以确保使用 mock
import src.api.agent_endpoints
importlib.reload(src.api.agent_endpoints)

# 导入被测试的模块
from src.api.agent_endpoints import call_deepseek_fallback


@pytest.mark.asyncio
async def test_fallback_requires_api_key(monkeypatch):
    """验证 fallback 在没有 API key 时返回错误"""
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

    result = await call_deepseek_fallback(
        system_prompt="You are a helpful assistant.",
        user_message="Hello"
    )

    assert "错误" in result
    assert "API Key" in result


@pytest.mark.asyncio
async def test_fallback_with_mock_api(monkeypatch):
    """验证 fallback 调用 DeepSeek API"""
    import httpx

    # Mock httpx.AsyncClient.post
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={
        "choices": [{"message": {"content": "Hello from DeepSeek!"}}]
    })

    # 创建 mock_client，post 方法返回 awaitable
    mock_client = MagicMock()

    async def mock_post(*args, **kwargs):
        return mock_response

    mock_client.post = mock_post

    # 使用 AsyncMock for __aenter__ and __aexit__
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()

    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await call_deepseek_fallback(
            system_prompt="You are a helpful assistant.",
            user_message="Hello"
        )

        assert "Hello from DeepSeek" in result


@pytest.mark.asyncio
async def test_fallback_handles_network_error(monkeypatch):
    """验证 fallback 处理网络错误"""
    import httpx

    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

    # 创建一个 AsyncClient mock，其 post 方法抛出 ConnectError
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={
        "choices": [{"message": {"content": "OK"}}]
    })

    async def mock_post(*args, **kwargs):
        raise httpx.ConnectError("Connection failed")

    async def mock_aenter(self):
        return self

    async def mock_aexit(self, *args):
        pass

    # 使用 spec 让 MagicMock 行为更像真实的 AsyncClient
    mock_client = MagicMock()
    mock_client.post = mock_post
    mock_client.__aenter__ = mock_aenter
    mock_client.__aexit__ = mock_aexit
    mock_client.response = mock_response

    def create_mock_client(*args, **kwargs):
        return mock_client

    # Patch httpx.AsyncClient - 它是一个 class，所以 patch 会替换整个类
    with patch("httpx.AsyncClient", create_mock_client):
        result = await call_deepseek_fallback(
            system_prompt="You are a helpful assistant.",
            user_message="Hello"
        )

        # Fallback 应该返回包含错误信息的结果
        assert result is not None
        assert "DeepSeek API" in result or "失败" in result or "error" in result.lower()


@pytest.mark.asyncio
async def test_fallback_uses_correct_base_url(monkeypatch):
    """验证 fallback 使用正确的 base URL"""
    import httpx

    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://custom.deepseek.com")

    called_url = []

    def mock_post(url, **kwargs):
        called_url.append(url)
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value={
            "choices": [{"message": {"content": "OK"}}]
        })
        return mock_response

    mock_client = MagicMock()
    mock_client.post = mock_post

    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()

    with patch("httpx.AsyncClient", return_value=mock_client):
        await call_deepseek_fallback("system", "user")

        assert any("custom.deepseek.com" in url for url in called_url)
