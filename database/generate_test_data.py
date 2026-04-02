#!/usr/bin/env python3
"""
SecAlert 测试数据生成脚本 (通过 API)

使用 HTTP API 向 SecAlert 生成模拟数据
"""

import requests
import random
import uuid
import json
from datetime import datetime, timezone, timedelta

API_BASE = "http://localhost:8000"

# ATT&CK 技术库
ATTACK_TECHNIQUES = [
    {"id": "T1190", "name": "Exploit Public-Facing Application", "tactic": "Initial Access"},
    {"id": "T1059", "name": "Command and Scripting Interpreter", "tactic": "Execution"},
    {"id": "T1046", "name": "Network Service Discovery", "tactic": "Discovery"},
    {"id": "T1110", "name": "Brute Force", "tactic": "Credential Access"},
    {"id": "T1005", "name": "Data from Local System", "tactic": "Collection"},
    {"id": "T1070", "name": "Data Destruction", "tactic": "Impact"},
    {"id": "T1484", "name": "Domain Trust Modification", "tactic": "Defense Evasion"},
    {"id": "T1566", "name": "Phishing", "tactic": "Initial Access"},
    {"id": "T1053", "name": "Scheduled Task/Job", "tactic": "Persistence"},
    {"id": "T1021", "name": "Remote Services", "tactic": "Lateral Movement"},
]

# 告警签名库
ALERT_SIGNATURES = [
    "ET SCAN Potential SSH Scan",
    "ET SCAN SSH Brute Force Attempt",
    "ET WEB_SERVER SQL Injection Attempt",
    "ET MALWARE Ransomware Behavioral Detected",
    "ET POLICY Outbound Traffic to Suspicious Domain",
    "ET EXPLOIT Buffer Overflow Attempt",
    "ET SCAN Nmap SYN Scan Detected",
    "ET MALWARE Known Ransomware File Extension",
    "ET POLICY Suspicious DNS Query",
    "ET ATTACK_RESPONSE Reverse Shell Detected",
]

# 源 IP 池
SRC_IPS = [
    "192.168.1.100", "10.0.0.50", "172.16.0.25", "203.0.113.50",
    "198.51.100.20", "192.0.2.100", "45.33.32.156", "128.199.50.100",
]

# 目标资产 IP
ASSET_IPS = [
    "10.0.0.10", "10.0.0.25", "10.0.0.30", "10.0.0.50", "10.0.0.100",
    "172.20.0.10", "172.20.0.20", "192.168.100.50",
]


def generate_alert():
    """生成单条告警"""
    technique = random.choice(ATTACK_TECHNIQUES)
    severity = random.choice([1, 2, 3, 4])
    timestamp = datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 72))

    return {
        "event_id": str(uuid.uuid4())[:8],
        "timestamp": timestamp.isoformat(),
        "src_ip": random.choice(SRC_IPS),
        "dst_ip": random.choice(ASSET_IPS),
        "event_type": "alert",
        "severity": severity,
        "alert_signature": random.choice(ALERT_SIGNATURES),
        "mitre_tactic": technique["tactic"],
        "mitre_technique_id": technique["id"],
        "mitre_technique_name": technique["name"],
    }


def feed_alerts(alerts):
    """通过 API 发送告警"""
    try:
        response = requests.post(
            f"{API_BASE}/api/chains/feed",
            json=alerts,
            timeout=30
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="SecAlert 测试数据生成")
    parser.add_argument("--count", type=int, default=20, help="生成的告警数量")
    args = parser.parse_args()

    print(f"正在生成 {args.count} 条告警...")

    alerts = [generate_alert() for _ in range(args.count)]

    # 分批发送
    batch_size = 10
    for i in range(0, len(alerts), batch_size):
        batch = alerts[i:i+batch_size]
        result = feed_alerts(batch)
        if "error" in result:
            print(f"  批次 {i//batch_size + 1} 失败: {result['error']}")
        else:
            print(f"  批次 {i//batch_size + 1}: {result.get('alerts_processed', 0)} 条告警")

    # 触发重建
    print("触发攻击链重建...")
    try:
        response = requests.post(f"{API_BASE}/api/chains/reconstruct", timeout=30)
        result = response.json()
        print(f"  重建完成: {result.get('chains_reconstructed', 0)} 条攻击链")
    except Exception as e:
        print(f"  重建失败: {e}")

    # 验证
    print("验证数据...")
    try:
        response = requests.get(f"{API_BASE}/api/chains", timeout=30)
        data = response.json()
        print(f"  当前攻击链数量: {data.get('total', 0)}")
    except Exception as e:
        print(f"  验证失败: {e}")

    print("数据生成完成!")


if __name__ == "__main__":
    main()
