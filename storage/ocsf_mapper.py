"""Suricata EVE JSON to OCSF (Open Cybersecurity Schema Framework) mapping."""
from datetime import datetime
from uuid import uuid4
from typing import Optional

# Severity mapping: Suricata severity (1-4) -> OCSF severity
SURICATA_SEVERITY_MAP = {
    1: "low",      # Info
    2: "medium",   # Low
    3: "high",     # Medium
    4: "critical"  # High/Critical
}


def map_suricata_to_ocsf(event: dict, source_name: str) -> dict:
    """
    Map Suricata EVE JSON alert to OCSF (Open Cybersecurity Schema Framework) format.

    Per user decision: Parser outputs directly in OCSF standard format.

    Args:
        event: Suricata EVE JSON alert event
        source_name: Name of the source device (e.g., "suricata-01")

    Returns:
        OCSF-compliant event dict with event_id, timestamp, source_type, etc.
    """
    alert_data = event.get("alert", {})

    # Map severity from Suricata (1-4) to OCSF string
    suricata_severity = alert_data.get("severity", 2)
    ocsf_severity = SURICATA_SEVERITY_MAP.get(suricata_severity, "medium")

    # Build OCSF event
    ocsf_event = {
        "event_id": str(uuid4()),
        "timestamp": event.get("timestamp", datetime.utcnow().isoformat()),
        "source_type": "ids",  # Suricata is an IDS
        "source_name": source_name,
        "event_type": event.get("event_type", "alert"),
        "network": {
            "src_ip": event.get("src_ip"),
            "src_port": event.get("src_port"),
            "dst_ip": event.get("dest_ip"),
            "dst_port": event.get("dest_port"),
            "protocol": event.get("proto")
        },
        "security": {
            "severity": ocsf_severity,
            "action": "detected",
            "alert_signature": alert_data.get("signature")
        },
        "raw_event": event
    }

    return ocsf_event


def severity_to_ocsf(suricata_severity: int) -> str:
    """Convert Suricata numeric severity to OCSF severity string."""
    return SURICATA_SEVERITY_MAP.get(suricata_severity, "medium")
