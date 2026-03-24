"""DSPy 程序 - 攻击链分类器

规则优先 + LLM 兜底的分类程序
遵循 parser/dspy/programs/log_parser.py 中的 LogParserProgram 模式
"""

# 检测 dspy-ai 是否真正可用（不仅仅是 stub 包）
DSPY_AVAILABLE = False
try:
    import dspy
    # 检查 dspy-ai 真正的类存在，而不是 stub
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
except ImportError:
    dspy = None

from typing import Dict, Any, Optional

from .signatures import FalsePositiveClassifierSignature
from .rules import ClassificationRules
from .severity import calculate_severity


if DSPY_AVAILABLE:
    class ChainClassifierProgram(dspy.Module):
        """攻击链分类程序 - 规则优先 + LLM 兜底

        分类策略（per D-02）：
        1. 预置规则高速判断（已知误报模式、已知攻击模式）
        2. LLM 兜底处理规则未覆盖情况

        置信度策略（per D-03）：
        - 规则直接命中高置信度攻击：>= 0.95
        - LLM 推断且证据强：0.6-0.85
        - 模糊情况：0.4-0.6
        - 低置信度指标：< 0.4
        """

        def __init__(self, lm=None):
            super().__init__()
            self.classify = dspy.ChainOfThought(FalsePositiveClassifierSignature)
            self.lm = lm
            self.rules = ClassificationRules()

        def forward(
            self,
            chain_data: Dict[str, Any],
            rule_result: Optional[Dict[str, Any]] = None,
            threat_intel: Optional[Dict[str, Any]] = None
        ) -> dspy.Prediction:
            """对攻击链进行分类

            Args:
                chain_data: 攻击链完整数据（包含 alerts 列表、ATT&CK 映射等）
                rule_result: 预置规则匹配结果，None 表示无规则命中
                threat_intel: 威胁情报命中情况

            Returns:
                dspy.Prediction: 包含 is_real_threat, confidence, reasoning, severity
            """
            # Layer 1: 规则快速判断
            if rule_result and rule_result.get("confidence", 0) >= 0.95:
                return self._rule_decision(rule_result)

            # Layer 2: DSPy LLM 推理（使用 ChainOfThought）
            return self.classify(
                chain_data=chain_data,
                rule_matched=rule_result,
                threat_intel=threat_intel or {}
            )

        def _rule_decision(self, rule_result: Dict[str, Any]) -> dspy.Prediction:
            """规则直接决策（高速路径）"""
            return dspy.Prediction(
                is_real_threat=rule_result.get("is_attack", False),
                confidence=rule_result.get("confidence", 0.0),
                reasoning=f"Rule matched: {rule_result.get('rule_name', 'unknown')}",
                severity=rule_result.get("severity", "medium")
            )

        def classify_with_threshold(
            self,
            chain_data: Dict[str, Any],
            rule_result: Optional[Dict[str, Any]] = None,
            threat_intel: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """带阈值的分类（per D-04）

            置信度 < 0.5 自动判定为误报并抑制

            Args:
                chain_data: 攻击链数据
                rule_result: 规则匹配结果
                threat_intel: 威胁情报

            Returns:
                包含分类结果和是否应被抑制
            """
            result = self.forward(chain_data, rule_result, threat_intel)

            # 严重度豁免：Critical/High 即使 confidence < 0.5 也进入待审核
            severity_override = result.severity in ["critical", "high"]

            should_suppress = (
                result.confidence < 0.5 and not severity_override
            )

            return {
                "is_real_threat": result.is_real_threat,
                "confidence": result.confidence,
                "reasoning": result.reasoning,
                "severity": result.severity,
                "should_suppress": should_suppress,
                "suppression_reason": (
                    "confidence < 0.5" if should_suppress and not severity_override
                    else "critical/high severity override" if severity_override
                    else None
                )
            }
else:
    # Stub 实现 - 当 dspy-ai 未安装时使用
    class _StubPrediction:
        """Stub for dspy.Prediction."""
        def __init__(self, is_real_threat=False, confidence=0.0, reasoning="", severity="medium"):
            self.is_real_threat = is_real_threat
            self.confidence = confidence
            self.reasoning = reasoning
            self.severity = severity

    class ChainClassifierProgram:
        """攻击链分类程序 - Stub 实现

        当 dspy-ai 未安装时使用此 stub。
        真正的 DSPy 程序在安装 dspy-ai 后自动使用。
        """

        def __init__(self, lm=None):
            self.lm = lm
            self.rules = ClassificationRules()

        def forward(
            self,
            chain_data: Dict[str, Any],
            rule_result: Optional[Dict[str, Any]] = None,
            threat_intel: Optional[Dict[str, Any]] = None
        ) -> _StubPrediction:
            """对攻击链进行分类（Stub）"""
            # Layer 1: 规则快速判断
            if rule_result and rule_result.get("confidence", 0) >= 0.95:
                return self._rule_decision(rule_result)

            # Stub: 当无 dspy 时，使用规则判断结果
            if rule_result:
                return _StubPrediction(
                    is_real_threat=rule_result.get("is_attack", False),
                    confidence=rule_result.get("confidence", 0.5),
                    reasoning=f"Rule matched: {rule_result.get('rule_name', 'unknown')}",
                    severity=rule_result.get("severity", "medium")
                )

            # 无规则匹配时返回未知
            return _StubPrediction(
                is_real_threat=False,
                confidence=0.5,
                reasoning="No rule matched, dspy not available",
                severity="medium"
            )

        def _rule_decision(self, rule_result: Dict[str, Any]) -> _StubPrediction:
            """规则直接决策（高速路径）"""
            return _StubPrediction(
                is_real_threat=rule_result.get("is_attack", False),
                confidence=rule_result.get("confidence", 0.0),
                reasoning=f"Rule matched: {rule_result.get('rule_name', 'unknown')}",
                severity=rule_result.get("severity", "medium")
            )

        def classify_with_threshold(
            self,
            chain_data: Dict[str, Any],
            rule_result: Optional[Dict[str, Any]] = None,
            threat_intel: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """带阈值的分类（per D-04）

            置信度 < 0.5 自动判定为误报并抑制
            """
            result = self.forward(chain_data, rule_result, threat_intel)

            # 严重度豁免：Critical/High 即使 confidence < 0.5 也进入待审核
            severity_override = result.severity in ["critical", "high"]

            should_suppress = (
                result.confidence < 0.5 and not severity_override
            )

            return {
                "is_real_threat": result.is_real_threat,
                "confidence": result.confidence,
                "reasoning": result.reasoning,
                "severity": result.severity,
                "should_suppress": should_suppress,
                "suppression_reason": (
                    "confidence < 0.5" if should_suppress and not severity_override
                    else "critical/high severity override" if severity_override
                    else None
                )
            }
