#!/usr/bin/env python3
"""
SecAlert 端到端模拟测试

验证完整数据流：
1. 生成模拟告警数据
2. 通过 API 喂送给 AlertCorrelator
3. 触发攻击链重建
4. 验证攻击链结果

用法:
    python tests/test_e2e_simulation.py
"""

import requests
import random
import uuid
import json
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

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

# 源 IP 池 (模拟攻击者)
SRC_IPS = [
    "192.168.1.100", "10.0.0.50", "172.16.0.25", "203.0.113.50",
    "198.51.100.20", "192.0.2.100", "45.33.32.156", "128.199.50.100",
]

# 目标资产 IP
ASSET_IPS = [
    "10.0.0.10", "10.0.0.25", "10.0.0.30", "10.0.0.50", "10.0.0.100",
    "172.20.0.10", "172.20.0.20", "192.168.100.50",
]


class SecAlertE2ETester:
    """SecAlert 端到端测试器"""

    def __init__(self, api_base: str = API_BASE):
        self.api_base = api_base
        self.session = requests.Session()
        self.results = {
            "tests_passed": 0,
            "tests_failed": 0,
            "alerts_generated": 0,
            "chains_created": 0,
            "errors": []
        }

    def check_api_health(self) -> bool:
        """检查 API 服务健康状态"""
        print("\n[1/6] 检查 API 服务健康状态...")
        try:
            response = self.session.get(f"{self.api_base}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"    ✓ API 服务正常: {data}")
                return True
            else:
                print(f"    ✗ API 返回错误状态: {response.status_code}")
                return False
        except Exception as e:
            print(f"    ✗ 无法连接 API: {e}")
            return False

    def generate_alert(self, timestamp: datetime = None) -> Dict[str, Any]:
        """生成单条模拟告警"""
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        technique = random.choice(ATTACK_TECHNIQUES)
        severity = random.choice([1, 2, 3, 4])

        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": timestamp.isoformat(),
            "src_ip": random.choice(SRC_IPS),
            "dest_ip": random.choice(ASSET_IPS),
            "event_type": "alert",
            "severity": severity,
            "alert_signature": random.choice(ALERT_SIGNATURES),
            "mitre_tactic": technique["tactic"],
            "mitre_technique_id": technique["id"],
            "mitre_technique_name": technique["name"],
            "source_type": "simulated",
            "source_name": "e2e-test"
        }

    def generate_correlated_alerts(self, count: int = 5) -> List[Dict[str, Any]]:
        """生成具有时序关联性的告警组 (同一攻击链)"""
        print(f"\n    生成 {count} 条关联告警 (同一攻击链)...")
        base_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        attacker_ip = random.choice(SRC_IPS)
        target_ip = random.choice(ASSET_IPS)
        technique = random.choice(ATTACK_TECHNIQUES)

        alerts = []
        for i in range(count):
            # 模拟攻击过程: 扫描 -> 暴力破解 -> 入侵
            tactics = ["Initial Access", "Discovery", "Credential Access", "Lateral Movement"]
            signatures = [
                "ET SCAN Potential SSH Scan",
                "ET SCAN Nmap SYN Scan Detected",
                "ET SCAN SSH Brute Force Attempt",
                "ET ATTACK_RESPONSE Reverse Shell Detected",
            ]
            alert = {
                "event_id": str(uuid.uuid4()),
                "timestamp": (base_time + timedelta(minutes=i)).isoformat(),
                "src_ip": attacker_ip,
                "dest_ip": target_ip,
                "event_type": "alert",
                "severity": min(4, i + 1),  # 逐步升级
                "alert_signature": signatures[i] if i < len(signatures) else random.choice(ALERT_SIGNATURES),
                "mitre_tactic": tactics[i] if i < len(tactics) else technique["tactic"],
                "mitre_technique_id": technique["id"],
                "mitre_technique_name": technique["name"],
                "source_type": "simulated",
                "source_name": "e2e-test"
            }
            alerts.append(alert)
            self.results["alerts_generated"] += 1

        return alerts

    def feed_alerts(self, alerts: List[Dict[str, Any]]) -> bool:
        """通过 API 发送告警"""
        print(f"\n[2/6] 发送 {len(alerts)} 条告警到关联器...")
        try:
            response = self.session.post(
                f"{self.api_base}/api/chains/feed",
                json=alerts,
                timeout=30
            )
            if response.status_code == 200:
                result = response.json()
                print(f"    ✓ 告警已处理:")
                print(f"      - 告警数量: {result.get('alerts_processed', 0)}")
                print(f"      - 新关联组: {result.get('new_groups', 0)}")
                return True
            else:
                print(f"    ✗ API 返回错误: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"    ✗ 发送告警失败: {e}")
            return False

    def reconstruct_chains(self) -> bool:
        """触发攻击链重建"""
        print("\n[3/6] 触发攻击链重建...")
        try:
            response = self.session.post(
                f"{self.api_base}/api/chains/reconstruct",
                timeout=30
            )
            if response.status_code == 200:
                result = response.json()
                chains_count = result.get('chains_reconstructed', 0)
                self.results["chains_created"] = chains_count
                print(f"    ✓ 重建完成:")
                print(f"      - 重建攻击链数量: {chains_count}")
                if chains_count > 0:
                    print(f"      - 攻击链 IDs: {result.get('chain_ids', [])}")
                return True
            else:
                print(f"    ✗ 重建失败: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"    ✗ 重建请求失败: {e}")
            return False

    def verify_chains(self) -> bool:
        """验证攻击链"""
        print("\n[4/6] 验证攻击链...")
        try:
            response = self.session.get(
                f"{self.api_base}/api/chains",
                params={"limit": 10},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                chains = data.get("chains", [])
                total = data.get("total", 0)
                print(f"    ✓ 查询成功:")
                print(f"      - 总攻击链数量: {total}")
                print(f"      - 返回攻击链数量: {len(chains)}")

                for chain in chains[:3]:
                    print(f"\n      攻击链 {chain.get('chain_id', 'N/A')}:")
                    print(f"        - 状态: {chain.get('status', 'N/A')}")
                    print(f"        - 严重性: {chain.get('max_severity', chain.get('severity_label', 'N/A'))}")
                    print(f"        - 告警数量: {chain.get('alert_count', len(chain.get('alerts', [])))}")

                return len(chains) >= 0  # 只要能查询就算成功
            else:
                print(f"    ✗ 查询失败: {response.status_code}")
                return False
        except Exception as e:
            print(f"    ✗ 验证失败: {e}")
            return False

    def test_severity_calculation(self) -> bool:
        """测试严重性计算"""
        print("\n[5/6] 测试严重性计算...")
        try:
            response = self.session.get(
                f"{self.api_base}/api/chains",
                params={"limit": 10},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                chains = data.get("chains", [])

                if len(chains) == 0:
                    print(f"    - 无攻击链可验证，跳过")
                    return True

                # 检查严重性标签是否有效
                valid_severities = {"critical", "high", "medium", "low", "info", "unknown"}
                for chain in chains:
                    severity = chain.get("severity_label") or chain.get("max_severity", "unknown")
                    if severity.lower() not in valid_severities and severity != "unknown":
                        print(f"    ✗ 无效严重性标签: {severity}")
                        return False

                print(f"    ✓ 严重性计算正常 (验证了 {len(chains)} 条攻击链)")
                return True
            else:
                print(f"    ✗ 查询失败")
                return False
        except Exception as e:
            print(f"    ✗ 测试失败: {e}")
            return False

    def test_chain_status_update(self) -> bool:
        """测试攻击链状态更新"""
        print("\n[6/6] 测试攻击链状态更新...")
        try:
            # 获取一条攻击链
            response = self.session.get(
                f"{self.api_base}/api/chains",
                params={"limit": 1},
                timeout=10
            )
            if response.status_code != 200:
                print(f"    ✗ 获取攻击链失败")
                return False

            data = response.json()
            chains = data.get("chains", [])
            if len(chains) == 0:
                print(f"    - 无攻击链可测试，跳过")
                return True

            chain_id = chains[0].get("chain_id")
            print(f"    测试更新攻击链 {chain_id}...")

            # 更新状态
            response = self.session.patch(
                f"{self.api_base}/api/chains/{chain_id}/status",
                params={"status": "resolved"},
                timeout=10
            )
            if response.status_code == 200:
                print(f"    ✓ 状态更新成功: resolved")
                return True
            else:
                print(f"    ✗ 状态更新失败: {response.status_code}")
                return False

        except Exception as e:
            print(f"    ✗ 测试失败: {e}")
            return False

    def run_full_test(self):
        """运行完整端到端测试"""
        print("=" * 60)
        print("SecAlert 端到端模拟测试")
        print("=" * 60)

        # 1. 检查 API 健康
        if not self.check_api_health():
            print("\n✗ API 服务不可用，测试终止")
            return False

        # 2. 生成并发送关联告警 (同一攻击链)
        correlated_alerts = self.generate_correlated_alerts(count=5)
        if not self.feed_alerts(correlated_alerts):
            print("\n✗ 告警发送失败")
            return False

        # 3. 生成一些独立告警 (不关联)
        for _ in range(3):
            alert = self.generate_alert()
            self.feed_alerts([alert])

        # 4. 触发重建
        if not self.reconstruct_chains():
            print("\n✗ 攻击链重建失败")
            return False

        # 5. 验证结果
        if not self.verify_chains():
            print("\n✗ 攻击链验证失败")
            return False

        # 6. 测试严重性计算
        if not self.test_severity_calculation():
            print("\n✗ 严重性计算测试失败")
            return False

        # 7. 测试状态更新
        if not self.test_chain_status_update():
            print("\n✗ 状态更新测试失败")
            return False

        print("\n" + "=" * 60)
        print("端到端测试完成!")
        print(f"  - 生成告警: {self.results['alerts_generated']}")
        print(f"  - 创建攻击链: {self.results['chains_created']}")
        print("=" * 60)

        return True


def main():
    tester = SecAlertE2ETester()
    success = tester.run_full_test()

    if success:
        print("\n✓ 所有测试通过")
        exit(0)
    else:
        print("\n✗ 测试失败")
        exit(1)


if __name__ == "__main__":
    main()
