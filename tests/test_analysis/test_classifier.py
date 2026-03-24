"""分类器单元测试

测试 FalsePositiveClassifierSignature 和 ChainClassifierProgram
重点覆盖：
1. 抑制阈值逻辑（confidence < 0.5 自动误报）
2. Critical/High 严重度豁免
3. 误报恢复逻辑
"""

import pytest
from unittest.mock import MagicMock, patch

from src.analysis.classifier.programs import ChainClassifierProgram
from src.analysis.classifier.rules import ClassificationRules


class TestChainClassifierProgram:
    """ChainClassifierProgram 测试"""

    def test_suppression_threshold_low_confidence(self, sample_chain_data):
        """测试：confidence < 0.5 应被抑制"""
        classifier = ChainClassifierProgram()

        # Mock forward 返回低置信度
        with patch.object(classifier, 'forward', return_value=MagicMock(
            is_real_threat=False,
            confidence=0.3,
            reasoning="Low confidence threat indicators",
            severity="low"
        )):
            result = classifier.classify_with_threshold(sample_chain_data)

        assert result["should_suppress"] is True
        assert result["confidence"] == 0.3
        assert "confidence < 0.5" in result["suppression_reason"]

    def test_suppression_threshold_high_confidence(self, sample_chain_data):
        """测试：confidence >= 0.5 不应被抑制"""
        classifier = ChainClassifierProgram()

        with patch.object(classifier, 'forward', return_value=MagicMock(
            is_real_threat=True,
            confidence=0.8,
            reasoning="High confidence attack indicators",
            severity="medium"
        )):
            result = classifier.classify_with_threshold(sample_chain_data)

        assert result["should_suppress"] is False
        assert result["confidence"] == 0.8

    def test_critical_severity_override(self, sample_chain_data):
        """测试：Critical 严重度即使 confidence < 0.5 也不应被抑制"""
        classifier = ChainClassifierProgram()

        with patch.object(classifier, 'forward', return_value=MagicMock(
            is_real_threat=True,
            confidence=0.4,  # < 0.5
            reasoning="Critical attack detected",
            severity="critical"  # 但严重度是 critical
        )):
            result = classifier.classify_with_threshold(sample_chain_data)

        # Critical/High 应豁免
        assert result["should_suppress"] is False
        assert "critical/high severity override" in result["suppression_reason"]

    def test_high_severity_override(self, sample_chain_data):
        """测试：High 严重度即使 confidence < 0.5 也不应被抑制"""
        classifier = ChainClassifierProgram()

        with patch.object(classifier, 'forward', return_value=MagicMock(
            is_real_threat=True,
            confidence=0.45,  # < 0.5
            reasoning="High severity attack",
            severity="high"
        )):
            result = classifier.classify_with_threshold(sample_chain_data)

        assert result["should_suppress"] is False

    def test_medium_severity_no_override(self, sample_chain_data):
        """测试：Medium 严重度 confidence < 0.5 应被抑制"""
        classifier = ChainClassifierProgram()

        with patch.object(classifier, 'forward', return_value=MagicMock(
            is_real_threat=False,
            confidence=0.4,
            reasoning="Medium severity ambiguous",
            severity="medium"
        )):
            result = classifier.classify_with_threshold(sample_chain_data)

        assert result["should_suppress"] is True

    def test_rule_high_confidence_bypass(self, sample_chain_data):
        """测试：规则直接命中 >= 0.95 置信度应直接决策"""
        classifier = ChainClassifierProgram()

        rule_result = {
            "is_attack": True,
            "confidence": 0.97,
            "rule_name": "known_malware",
            "severity": "critical"
        }

        result = classifier.classify_with_threshold(
            sample_chain_data,
            rule_result=rule_result
        )

        # 规则匹配应直接返回，不调用 LLM
        assert result["is_real_threat"] is True
        assert result["confidence"] == 0.97
        assert "known_malware" in result["reasoning"]


class TestClassificationRules:
    """ClassificationRules 测试"""

    def test_known_false_positive_pattern(self):
        """测试：已知误报模式匹配"""
        rules = ClassificationRules()

        # 构造已知误报告警（使用独立数据避免fixture污染）
        chain_data = {
            "chain_id": "test-fp",
            "alerts": [
                {"alert_signature": "SCAN", "mitre_technique_id": "T1595"}
            ]
        }

        result = rules.check(chain_data)

        assert result is not None
        assert result["is_attack"] is False
        assert result["confidence"] == 0.98
        assert "maintenance" in result["rule_name"]

    def test_known_attack_pattern(self):
        """测试：已知攻击模式匹配"""
        rules = ClassificationRules()

        # 构造已知攻击告警
        chain_data = {
            "chain_id": "test-attack",
            "alerts": [
                {"alert_signature": "COBALT_STRIKE", "mitre_technique_id": "T1071"}
            ]
        }

        result = rules.check(chain_data)

        assert result is not None
        assert result["is_attack"] is True
        assert result["severity"] == "critical"

    def test_no_match(self):
        """测试：无规则匹配时返回 None"""
        rules = ClassificationRules()

        # 构造无匹配告警
        chain_data = {
            "chain_id": "test-unknown",
            "alerts": [
                {"alert_signature": "UNKNOWN_SIGNATURE_12345", "mitre_technique_id": "T9999"}
            ]
        }

        result = rules.check(chain_data)

        assert result is None

    def test_add_rule(self):
        """测试：动态添加规则"""
        rules = ClassificationRules()
        initial_count = len(rules.get_rules())

        from src.analysis.classifier.rules import ClassificationRule
        rules.add_rule(ClassificationRule(
            name="test_rule",
            description="Test rule",
            is_attack=True,
            confidence=0.99,
            severity="high"
        ))

        assert len(rules.get_rules()) == initial_count + 1
