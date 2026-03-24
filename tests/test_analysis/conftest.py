"""SecAlert 分析层测试 fixtures

提供测试所需的 mock 数据和 fixtures
"""

import pytest
from typing import Dict, Any, List


@pytest.fixture
def sample_chain_data() -> Dict[str, Any]:
    """样例攻击链数据（来自 Phase 2 输出）"""
    return {
        "chain_id": "chain-001",
        "start_time": "2026-03-24T10:00:00Z",
        "end_time": "2026-03-24T10:05:00Z",
        "alert_count": 5,
        "max_severity": 75,
        "status": "active",
        "asset_ip": "192.168.1.100",
        "alerts": [
            {
                "alert_id": "alert-001",
                "timestamp": "2026-03-24T10:00:00Z",
                "src_ip": "10.0.0.1",
                "dst_ip": "192.168.1.100",
                "event_type": "network",
                "severity": 60,
                "alert_signature": "ET SCAN",
                "mitre_tactic": "TA0011",
                "mitre_technique_id": "T1595",
                "mitre_technique_name": "Active Scanning"
            },
            {
                "alert_id": "alert-002",
                "timestamp": "2026-03-24T10:01:00Z",
                "src_ip": "10.0.0.1",
                "dst_ip": "192.168.1.100",
                "event_type": "network",
                "severity": 70,
                "alert_signature": "ET EXPLOIT",
                "mitre_tactic": "TA0011",
                "mitre_technique_id": "T1190",
                "mitre_technique_name": "Exploit Public-Facing Application"
            },
            {
                "alert_id": "alert-003",
                "timestamp": "2026-03-24T10:02:00Z",
                "src_ip": "10.0.0.1",
                "dst_ip": "192.168.1.100",
                "event_type": "network",
                "severity": 80,
                "alert_signature": "COBALT_STRIKE",
                "mitre_tactic": "TA0011",
                "mitre_technique_id": "T1071",
                "mitre_technique_name": "Application Layer Protocol"
            }
        ]
    }


@pytest.fixture
def false_positive_chain_data() -> Dict[str, Any]:
    """误报攻击链数据"""
    return {
        "chain_id": "chain-fp-001",
        "start_time": "2026-03-24T09:00:00Z",
        "end_time": "2026-03-24T09:05:00Z",
        "alert_count": 3,
        "max_severity": 30,
        "status": "false_positive",
        "asset_ip": "192.168.1.50",
        "alerts": [
            {
                "alert_id": "alert-fp-001",
                "timestamp": "2026-03-24T09:00:00Z",
                "src_ip": "192.168.1.1",
                "dst_ip": "192.168.1.50",
                "event_type": "network",
                "severity": 20,
                "alert_signature": "SCAN",
                "mitre_tactic": "TA0011",
                "mitre_technique_id": "T1595",
                "mitre_technique_name": "Active Scanning"
            }
        ]
    }


@pytest.fixture
def mock_neo4j_chains() -> List[Dict[str, Any]]:
    """Mock Neo4j chains 数据"""
    return [
        {
            "chain_id": "chain-001",
            "status": "active",
            "max_severity": 80,
            "alert_count": 5
        },
        {
            "chain_id": "chain-002",
            "status": "false_positive",
            "max_severity": 20,
            "alert_count": 2
        },
        {
            "chain_id": "chain-003",
            "status": "active",
            "max_severity": 90,
            "alert_count": 8
        },
        {
            "chain_id": "chain-004",
            "status": "false_positive",
            "max_severity": 30,
            "alert_count": 1
        }
    ]
