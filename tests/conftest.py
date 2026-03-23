import pytest
from datetime import datetime, timezone
from typing import Dict, List
import uuid

# --- Mock OCSF Alert Fixtures ---

@pytest.fixture
def mock_ocsf_alert() -> Dict:
    """生成单条 mock OCSF 格式告警"""
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "suricata",
        "event_type": "alert",
        "alert_signature": "ET SCAN Potential SSH Scan",
        "severity": 2,
        "src_ip": "192.168.1.100",
        "dst_ip": "10.0.0.50",
        "src_port": 45678,
        "dst_port": 22,
        "protocol": "TCP",
        "ocsf_event": {"raw": "suricata alert event"}
    }

@pytest.fixture
def mock_ocsf_alerts() -> List[Dict]:
    """生成多条 mock OCSF 格式告警，用于关联测试"""
    base_time = datetime(2026, 3, 23, 10, 0, 0, tzinfo=timezone.utc)
    return [
        {
            "event_id": str(uuid.uuid4()),
            "timestamp": (base_time).isoformat(),
            "source_type": "suricata",
            "event_type": "alert",
            "alert_signature": "ET SCAN Potential SSH Scan",
            "severity": 2,
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "src_port": 45678,
            "dst_port": 22,
            "protocol": "TCP"
        },
        {
            "event_id": str(uuid.uuid4()),
            "timestamp": (base_time.replace(minute=2)).isoformat(),
            "source_type": "suricata",
            "event_type": "alert",
            "alert_signature": "ET SCAN Potential SSH Scan",
            "severity": 2,
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "src_port": 45679,
            "dst_port": 22,
            "protocol": "TCP"
        },
        {
            "event_id": str(uuid.uuid4()),
            "timestamp": (base_time.replace(minute=5)).isoformat(),
            "source_type": "suricata",
            "event_type": "alert",
            "alert_signature": "ET EXPLOIT SSH Root Auth Fail",
            "severity": 3,
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "src_port": 45680,
            "dst_port": 22,
            "protocol": "TCP"
        }
    ]

@pytest.fixture
def mock_suricata_alert_with_attck() -> Dict:
    """生成带 ATT&CK 映射信息的 Suricata 告警"""
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_type": "suricata",
        "event_type": "alert",
        "alert_signature": "ET SCAN Potential SSH Scan",
        "severity": 2,
        "src_ip": "192.168.1.100",
        "dst_ip": "10.0.0.50",
        "mitre_tactic": "TA0004",
        "mitre_technique_id": "T1021",
        "mitre_technique_name": "Remote Services"
    }

# --- Neo4j Test Client Fixture ---
# 注意: 实际的 Neo4j fixture 将在 02-04 plan 的 service 层实现
# 此处仅提供类型注解和 mock
