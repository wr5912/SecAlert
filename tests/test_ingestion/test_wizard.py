"""
数据接入向导状态测试

测试 DS-05: 向导步骤切换验证
测试 DS-06: 前端组件渲染（状态管理）
"""

import pytest
from fastapi.testclient import TestClient


def test_create_template_multi_step_flow(test_client: TestClient):
    """DS-05: 完整向导流程 - 4步骤创建模板"""
    # Step 1: 选择设备类型
    device_type = "firewall"

    # Step 2: 配置连接参数
    connection = {
        "host": "192.168.1.100",
        "port": 22,
        "username": "admin",
        "password": "secret",
        "protocol": "ssh"
    }

    # Step 3: 选择日志格式
    log_format = "syslog"

    # Step 4: 完成 (提交完整模板)
    template_data = {
        "name": "防火墙-测试",
        "device_type": device_type,
        "connection": connection,
        "log_format": log_format,
        "custom_regex": None
    }

    response = test_client.post("/api/ingestion/templates", json=template_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "防火墙-测试"
    assert data["device_type"] == "firewall"
    assert data["connection"]["host"] == "192.168.1.100"


def test_wizard_device_types(test_client: TestClient):
    """DS-05: 测试所有支持的设备类型"""
    device_types = ["firewall", "ids", "vpn", "switch", "router", "waf", "other"]

    for device_type in device_types:
        template = {
            "name": f"测试-{device_type}",
            "device_type": device_type,
            "connection": {
                "host": "192.168.1.1",
                "port": 22,
                "username": "admin",
                "password": "secret",
                "protocol": "ssh"
            },
            "log_format": "syslog"
        }
        response = test_client.post("/api/ingestion/templates", json=template)
        assert response.status_code == 201, f"设备类型 {device_type} 失败"


def test_wizard_log_formats(test_client: TestClient):
    """DS-05: 测试所有支持的日志格式"""
    log_formats = ["CEF", "Syslog", "JSON", "Custom"]

    for log_format in log_formats:
        template = {
            "name": f"测试-{log_format}",
            "device_type": "firewall",
            "connection": {
                "host": "192.168.1.1",
                "port": 22,
                "username": "admin",
                "password": "secret",
                "protocol": "ssh"
            },
            "log_format": log_format,
            "custom_regex": "/.*/" if log_format == "Custom" else None
        }
        response = test_client.post("/api/ingestion/templates", json=template)
        assert response.status_code == 201, f"日志格式 {log_format} 失败"


def test_wizard_connection_validation(test_client: TestClient):
    """DS-05: 测试连接参数验证"""
    # 缺少必填字段
    invalid_template = {
        "name": "测试",
        "device_type": "firewall",
        "connection": {
            "host": "192.168.1.1"
            # 缺少 port, username, password
        },
        "log_format": "syslog"
    }
    response = test_client.post("/api/ingestion/templates", json=invalid_template)
    assert response.status_code == 422  # Validation error
