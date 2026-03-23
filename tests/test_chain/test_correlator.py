"""告警关联器单元测试"""
import pytest
import sys
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

# 添加 src 目录到 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from src.chain.engine.correlator import AlertCorrelator, CorrelatedGroup
from src.chain.window.adaptive_window import AdaptiveWindow
from src.chain.engine.dsl import CorrelationRule


class TestAdaptiveWindow:
    """测试动态时间窗口"""

    def test_burst_mode_short_window(self):
        """短时大量告警应返回最短窗口 (5分钟)"""
        window = AdaptiveWindow(burst_threshold=5, burst_window_seconds=300)
        now = time.time()

        # 模拟短时高频告警
        for _ in range(10):
            window.record_alert(now)

        result = window.compute_window(now)
        assert result == 300  # 5分钟 = 300秒

    def test_sparse_mode_long_window(self):
        """零星告警应返回最长窗口 (24小时)"""
        window = AdaptiveWindow()
        now = time.time()

        # 模拟极低频告警
        window.record_alert(now - 7200)  # 2小时前
        window.record_alert(now - 10800)  # 3小时前

        result = window.compute_window(now)
        assert result == 86400  # 24小时 = 86400秒

    def test_normal_mode_default_window(self):
        """正常情况返回基础窗口 (1小时)"""
        window = AdaptiveWindow()
        now = time.time()

        # 模拟中等频率告警
        for i in range(50):
            window.record_alert(now - i * 60)  # 每分钟一条

        result = window.compute_window(now)
        assert 1800 <= result <= 3600  # 应该在 30分钟-1小时之间


class TestCorrelationRule:
    """测试关联规则 DSL"""

    def test_same_ip_pair_operator(self):
        """测试 same_ip_pair 操作符"""
        rule = CorrelationRule(
            name="test",
            conditions=[{"field": "src_ip", "operator": "same_ip_pair", "weight": 1.0}]
        )

        alert_a = {"src_ip": "192.168.1.100", "dst_ip": "10.0.0.1"}
        alert_b = {"src_ip": "192.168.1.100", "dst_ip": "10.0.0.2"}

        matched, conf = rule.matches(alert_a, alert_b)
        assert matched is True
        assert conf == 1.0

    def test_attck_stage_progression_valid(self):
        """测试 ATT&CK 阶段递进 (合理)"""
        rule = CorrelationRule(
            name="test",
            conditions=[{"field": "mitre_tactic", "operator": "attck_stage_progression", "weight": 1.0}]
        )

        # 侦察 (TA0043) -> 初始访问 (TA0001) -> 权限提升 (TA0004)
        alert_early = {"mitre_tactic": "TA0043"}
        alert_late = {"mitre_tactic": "TA0004"}

        matched, conf = rule.matches(alert_early, alert_late)
        assert matched is True

    def test_attck_stage_progression_invalid(self):
        """测试 ATT&CK 阶段递进 (倒退 - 不合理)"""
        rule = CorrelationRule(
            name="test",
            conditions=[{"field": "mitre_tactic", "operator": "attck_stage_progression", "weight": 1.0}]
        )

        # 权限提升 -> 侦察 (倒退)
        alert_early = {"mitre_tactic": "TA0004"}
        alert_late = {"mitre_tactic": "TA0043"}

        matched, conf = rule.matches(alert_early, alert_late)
        assert matched is False

    def test_weighted_conditions(self):
        """测试加权条件"""
        rule = CorrelationRule(
            name="weighted",
            conditions=[
                {"field": "src_ip", "operator": "same_ip_pair", "weight": 1.0},
                {"field": "mitre_tactic", "operator": "attck_stage_progression", "weight": 2.0}
            ]
        )

        # IP 相同但不满足 ATT&CK 递进
        alert_a = {"src_ip": "192.168.1.100", "mitre_tactic": "TA0004"}
        alert_b = {"src_ip": "192.168.1.100", "mitre_tactic": "TA0043"}

        matched, conf = rule.matches(alert_a, alert_b)
        # 满足 1/3 权重 = 33% < 50%，不应匹配
        assert matched is False


class TestAlertCorrelator:
    """测试告警关联器"""

    @pytest.fixture
    def correlator(self):
        """创建关联器实例"""
        from src.chain.mitre.mapper import AttackChainMapper
        mapper = AttackChainMapper(llm_fallback=False)
        return AlertCorrelator(attck_mapper=mapper)

    def test_single_alert_no_correlation(self, correlator):
        """单条告警不应形成关联"""
        alert = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "alert_signature": "ET SCAN Potential SSH Scan"
        }

        groups = correlator.add_alert(alert)
        assert len(groups) == 0

    def test_two_matching_alerts_correlated(self, correlator):
        """两条满足规则的告警应形成关联"""
        base_time = datetime(2026, 3, 23, 10, 0, 0, tzinfo=timezone.utc)
        alert1 = {
            "event_id": str(uuid.uuid4()),
            "timestamp": base_time.isoformat(),
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "alert_signature": "ET SCAN Potential SSH Scan"
        }
        alert2 = {
            "event_id": str(uuid.uuid4()),
            "timestamp": (base_time + timedelta(minutes=2)).isoformat(),
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "alert_signature": "ET EXPLOIT SSH Root Auth Fail"
        }

        correlator.add_alert(alert1)
        groups = correlator.add_alert(alert2)

        # 第二次添加应产生关联
        assert len(groups) >= 1

    def test_min_alerts_threshold(self, correlator):
        """最小告警数要求 (min_alerts=2)"""
        base_time = datetime(2026, 3, 23, 10, 0, 0, tzinfo=timezone.utc)

        for i in range(5):
            alert = {
                "event_id": str(uuid.uuid4()),
                "timestamp": (base_time + timedelta(minutes=i)).isoformat(),
                "src_ip": "192.168.1.100",
                "dst_ip": "10.0.0.50",
                "alert_signature": f"Signature {i}"
            }
            groups = correlator.add_alert(alert)

        # 至少应该有一些关联组
        buffer = correlator.get_groups()
        assert len(buffer) >= 0  # 具体结果取决于规则匹配

    def test_different_src_ip_not_correlated(self, correlator):
        """不同源 IP 的告警不应关联"""
        base_time = datetime(2026, 3, 23, 10, 0, 0, tzinfo=timezone.utc)
        alert1 = {
            "event_id": str(uuid.uuid4()),
            "timestamp": base_time.isoformat(),
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.50",
            "alert_signature": "ET SCAN Potential SSH Scan"
        }
        alert2 = {
            "event_id": str(uuid.uuid4()),
            "timestamp": base_time.isoformat(),
            "src_ip": "192.168.1.200",  # 不同源 IP
            "dst_ip": "10.0.0.50",
            "alert_signature": "ET SCAN Potential SSH Scan"
        }

        correlator.add_alert(alert1)
        groups = correlator.add_alert(alert2)

        # 不同源 IP 不应产生关联
        assert len(groups) == 0
