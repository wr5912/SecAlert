"""攻击链 API 集成测试"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

# Mock Neo4j before importing API
with patch('src.graph.client.GraphDatabase'):
    from src.api.chain_endpoints import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)


class TestChainEndpoints:
    """测试攻击链 API 端点"""

    def test_list_chains_empty(self):
        """测试列出攻击链 (空)"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.list_chains.return_value = {
                "chains": [],
                "total": 0,
                "limit": 50,
                "offset": 0
            }
            mock_get.return_value = mock_service

            response = client.get("/api/chains")

            assert response.status_code == 200
            data = response.json()
            assert data["chains"] == []
            assert data["total"] == 0

    def test_list_chains_with_data(self):
        """测试列出攻击链 (有数据)"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.list_chains.return_value = {
                "chains": [
                    {
                        "chain_id": "chain-1",
                        "start_time": "2026-03-23T10:00:00Z",
                        "end_time": "2026-03-23T10:30:00Z",
                        "alert_count": 3,
                        "max_severity": 4,
                        "status": "active",
                        "asset_ip": "10.0.0.50",
                        "alerts": []
                    }
                ],
                "total": 1,
                "limit": 50,
                "offset": 0
            }
            mock_get.return_value = mock_service

            response = client.get("/api/chains")

            assert response.status_code == 200
            data = response.json()
            assert len(data["chains"]) == 1
            assert data["chains"][0]["chain_id"] == "chain-1"

    def test_get_chain_not_found(self):
        """测试获取不存在的攻击链"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.get_chain.return_value = None
            mock_get.return_value = mock_service

            response = client.get("/api/chains/nonexistent")

            assert response.status_code == 404

    def test_get_chain_found(self):
        """测试获取存在的攻击链"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.get_chain.return_value = MagicMock(
                chain_id="chain-1",
                start_time="2026-03-23T10:00:00Z",
                end_time="2026-03-23T10:30:00Z",
                alert_count=2,
                max_severity=3,
                status="active",
                asset_ip="10.0.0.50",
                alerts=[]
            )
            mock_get.return_value = mock_service

            response = client.get("/api/chains/chain-1")

            assert response.status_code == 200
            data = response.json()
            assert data["chain_id"] == "chain-1"

    def test_list_chains_pagination(self):
        """测试分页参数"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.list_chains.return_value = {
                "chains": [],
                "total": 100,
                "limit": 10,
                "offset": 20
            }
            mock_get.return_value = mock_service

            response = client.get("/api/chains?limit=10&offset=20")

            assert response.status_code == 200
            mock_service.list_chains.assert_called_once_with(limit=10, offset=20, status=None)

    def test_list_chains_filter_by_status(self):
        """测试按状态过滤"""
        with patch('src.api.chain_endpoints.get_service') as mock_get:
            mock_service = MagicMock()
            mock_service.list_chains.return_value = {
                "chains": [],
                "total": 5,
                "limit": 50,
                "offset": 0
            }
            mock_get.return_value = mock_service

            response = client.get("/api/chains?status=active")

            assert response.status_code == 200
            mock_service.list_chains.assert_called_once_with(
                limit=50, offset=0, status="active"
            )

    def test_reconstruct_endpoint(self):
        """测试重建端点 (placeholder)"""
        response = client.post("/api/chains/reconstruct")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "placeholder"
