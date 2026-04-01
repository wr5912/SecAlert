"""
数据源模板 CRUD API 测试

测试 DS-01~DS-04: 模板创建、读取、更新、删除、列表
"""

import pytest
from fastapi.testclient import TestClient


def test_list_templates_empty(test_client: TestClient):
    """DS-04: 列表查询 - 空列表"""
    response = test_client.get("/api/ingestion/templates")
    assert response.status_code == 200
    data = response.json()
    assert "templates" in data
    assert isinstance(data["templates"], list)


def test_create_template(test_client: TestClient, sample_template: dict):
    """DS-01: 创建数据源模板"""
    response = test_client.post(
        "/api/ingestion/templates",
        json=sample_template
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == sample_template["name"]
    assert data["device_type"] == sample_template["device_type"]
    assert "id" in data


def test_create_and_list_template(test_client: TestClient, sample_template: dict):
    """DS-01+DS-04: 创建后能查到"""
    # 创建
    create_resp = test_client.post("/api/ingestion/templates", json=sample_template)
    assert create_resp.status_code == 201
    template_id = create_resp.json()["id"]

    # 列表
    list_resp = test_client.get("/api/ingestion/templates")
    assert list_resp.status_code == 200
    templates = list_resp.json()["templates"]
    assert any(t["id"] == template_id for t in templates)


def test_update_template(test_client: TestClient, sample_template: dict):
    """DS-02: 编辑数据源模板"""
    # 创建
    create_resp = test_client.post("/api/ingestion/templates", json=sample_template)
    assert create_resp.status_code == 201
    template_id = create_resp.json()["id"]

    # 更新
    updated_data = {**sample_template, "name": "更新后的名称"}
    update_resp = test_client.put(
        f"/api/ingestion/templates/{template_id}",
        json=updated_data
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "更新后的名称"


def test_delete_template(test_client: TestClient, sample_template: dict):
    """DS-03: 删除数据源模板"""
    # 创建
    create_resp = test_client.post("/api/ingestion/templates", json=sample_template)
    assert create_resp.status_code == 201
    template_id = create_resp.json()["id"]

    # 删除
    delete_resp = test_client.delete(f"/api/ingestion/templates/{template_id}")
    assert delete_resp.status_code == 200

    # 确认已删除
    list_resp = test_client.get("/api/ingestion/templates")
    templates = list_resp.json()["templates"]
    assert not any(t["id"] == template_id for t in templates)


def test_delete_nonexistent(test_client: TestClient):
    """DS-03: 删除不存在的模板"""
    response = test_client.delete("/api/ingestion/templates/nonexistent-id")
    assert response.status_code == 404
