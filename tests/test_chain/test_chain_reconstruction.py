"""攻击链构建单元测试"""
import pytest
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from src.chain.attack_chain.models import AttackChainModel, AlertModel
from src.chain.attack_chain.service import AttackChainService
from src.chain.engine.correlator import AlertCorrelator
from src.graph.client import Neo4jClient


class TestAttackChainModels:
    """测试攻击链模型"""

    def test_alert_model_creation(self):
        """测试 AlertModel 创建"""
        alert = AlertModel(
            alert_id="test-123",
            timestamp="2026-03-23T10:00:00Z",
            src_ip="192.168.1.100",
            dst_ip="10.0.0.50",
            severity=3,
            alert_signature="ET EXPLOIT SSH Root Auth Fail",
            mitre_tactic="TA0006",
            mitre_technique_id="T1021",
            mitre_technique_name="Remote Services"
        )

        assert alert.alert_id == "test-123"
        assert alert.src_ip == "192.168.1.100"
        assert alert.mitre_tactic == "TA0006"

    def test_attack_chain_model_creation(self):
        """测试 AttackChainModel 创建"""
        alerts = [
            AlertModel(alert_id="alert-1", severity=2),
            AlertModel(alert_id="alert-2", severity=3),
        ]

        chain = AttackChainModel(
            chain_id="chain-123",
            start_time="2026-03-23T10:00:00Z",
            end_time="2026-03-23T10:30:00Z",
            alert_count=2,
            max_severity=3,
            status="active",
            asset_ip="10.0.0.50",
            alerts=alerts
        )

        assert chain.chain_id == "chain-123"
        assert len(chain.alerts) == 2
        assert chain.max_severity == 3


class TestAttackChainService:
    """测试攻击链服务"""

    @pytest.fixture
    def mock_neo4j(self):
        """创建 Mock Neo4j 客户端"""
        class MockNeo4j:
            def write_alert(self, alert):
                return alert.get("event_id", "mock-alert-id")

            def create_attack_chain(self, chain_data):
                return chain_data.get("chain_id", "mock-chain-id")

            def get_chain_by_id(self, chain_id):
                return None

            def list_chains(self, limit=50, offset=0, status=None):
                return []

            def close(self):
                pass

        return MockNeo4j()

    @pytest.fixture
    def service(self, mock_neo4j):
        return AttackChainService(neo4j_client=mock_neo4j)

    def test_build_chain_from_correlation(self, service):
        """测试从关联组构建攻击链"""
        correlated_group = {
            "group_id": "test-group-1",
            "correlation_type": "ip"
        }

        alerts = [
            {
                "event_id": "alert-1",
                "timestamp": "2026-03-23T10:00:00Z",
                "src_ip": "192.168.1.100",
                "dst_ip": "10.0.0.50",
                "severity": 2,
                "alert_signature": "Scan"
            },
            {
                "event_id": "alert-2",
                "timestamp": "2026-03-23T10:05:00Z",
                "src_ip": "192.168.1.100",
                "dst_ip": "10.0.0.50",
                "severity": 3,
                "alert_signature": "Exploit"
            }
        ]

        chain = service.build_chain_from_correlation(correlated_group, alerts)

        assert chain.chain_id == "test-group-1"
        assert chain.alert_count == 2
        assert chain.max_severity == 3
        assert chain.asset_ip == "10.0.0.50"
        assert len(chain.alerts) == 2

    def test_save_chain_calls_neo4j(self, service, mock_neo4j):
        """测试保存攻击链调用 Neo4j"""
        alerts = [AlertModel(alert_id="alert-1", severity=2)]
        chain = AttackChainModel(
            chain_id="test-chain",
            alert_count=1,
            max_severity=2,
            alerts=alerts
        )

        chain_id = service.save_chain(chain)

        assert chain_id == "test-chain"


class TestChainTimeline:
    """测试攻击链时间线"""

    def test_alerts_sorted_by_timestamp(self):
        """测试告警按时间戳排序"""
        alerts = [
            AlertModel(alert_id="alert-3", timestamp="2026-03-23T10:20:00Z"),
            AlertModel(alert_id="alert-1", timestamp="2026-03-23T10:00:00Z"),
            AlertModel(alert_id="alert-2", timestamp="2026-03-23T10:10:00Z"),
        ]

        chain = AttackChainModel(
            chain_id="test",
            alerts=alerts
        )

        # 按时间排序
        sorted_alerts = sorted(chain.alerts, key=lambda a: a.timestamp or "")

        assert sorted_alerts[0].alert_id == "alert-1"
        assert sorted_alerts[1].alert_id == "alert-2"
        assert sorted_alerts[2].alert_id == "alert-3"
