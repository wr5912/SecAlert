"""
数据接入模块测试配置

共享 fixtures 和测试配置
"""

import pytest
from typing import Generator
from fastapi.testclient import TestClient


@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """创建 FastAPI 测试客户端"""
    from src.api.main import app
    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_template() -> dict:
    """示例数据源模板"""
    return {
        "name": "测试防火墙",
        "device_type": "firewall",
        "connection": {
            "host": "192.168.1.1",
            "port": 22,
            "username": "admin",
            "password": "secret",
            "protocol": "ssh"
        },
        "log_format": "syslog",
        "custom_regex": None
    }


@pytest.fixture
def sample_templates(sample_template: dict) -> list:
    """多个示例模板"""
    return [
        sample_template,
        {
            **sample_template,
            "name": "测试 IDS",
            "device_type": "ids",
            "connection": {
                **sample_template["connection"],
                "host": "192.168.1.2"
            }
        }
    ]
