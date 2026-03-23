"""ATT&CK 映射器单元测试"""
import pytest
import sys
import os

# 添加 src 目录到 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from src.chain.mitre.mapper import AttackChainMapper, AttackMapping


class TestAttackChainMapper:
    """测试 AttackChainMapper 类"""

    @pytest.fixture
    def mapper(self):
        """创建 ATT&CK 映射器实例"""
        rule_file = os.path.join(os.path.dirname(__file__), "../../rules/attck_suricata.yaml")
        return AttackChainMapper(rule_file=rule_file, llm_fallback=False)

    def test_rule_lookup_known_signature(self, mapper):
        """测试预置规则查找 - 已知告警签名"""
        alert = {
            "alert_signature": "ET SCAN Potential SSH Scan",
            "event_type": "alert"
        }
        result = mapper.map_to_attack(alert)

        assert result.tactic == "TA0043"
        assert result.technique_id == "T1046"
        assert result.technique_name == "Network Service Discovery"
        assert result.confidence == 0.95
        assert result.source == "rule"

    def test_rule_lookup_et_exploit_ssh(self, mapper):
        """测试 SSH 暴力破解告警映射"""
        alert = {
            "alert_signature": "ET EXPLOIT SSH Root Auth Fail"
        }
        result = mapper.map_to_attack(alert)

        assert result.tactic == "TA0006"
        assert result.technique_id == "T1021"
        assert result.technique_name == "Remote Services"

    def test_rule_lookup_not_found(self, mapper):
        """测试未知告警签名 (无 LLM fallback)"""
        alert = {
            "alert_signature": "UNKNOWN ATTACK SIGNATURE XYZ"
        }
        result = mapper.map_to_attack(alert)

        assert result.tactic is None
        assert result.technique_id is None
        assert result.confidence == 0.0
        assert result.source == "none"

    def test_get_tactic_name(self, mapper):
        """测试 tactic ID 到名称转换"""
        assert mapper.get_tactic_name("TA0001") == "Initial Access"
        assert mapper.get_tactic_name("TA0006") == "Credential Access"
        assert mapper.get_tactic_name("UNKNOWN") == "UNKNOWN"

    def test_empty_alert_signature(self, mapper):
        """测试空告警签名"""
        alert = {"event_type": "generic"}
        result = mapper.map_to_attack(alert)

        # 应该走 LLM fallback 或返回 none
        assert result.source in ["none", "llm", "llm_error"]

    def test_confidence_scores(self, mapper):
        """测试不同来源的置信度"""
        # 规则匹配应该有高置信度
        known_alert = {"alert_signature": "ET SCAN Potential SSH Scan"}
        known_result = mapper.map_to_attack(known_alert)
        assert known_result.confidence == 0.95

        # 未知告警应该低置信度
        unknown_alert = {"alert_signature": "RANDOM XYZ"}
        unknown_result = mapper.map_to_attack(unknown_alert)
        assert unknown_result.confidence == 0.0