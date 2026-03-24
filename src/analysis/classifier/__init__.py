"""误报分类器模块

规则优先 + LLM 兜底的攻击链二分类器
"""
from .signatures import FalsePositiveClassifierSignature
from .programs import ChainClassifierProgram
from .severity import calculate_severity, ATTACK_TECHNIQUE_SEVERITY, SEVERITY_CONTEXT_MULTIPLIERS
from .rules import ClassificationRules

__all__ = [
    "FalsePositiveClassifierSignature",
    "ChainClassifierProgram",
    "calculate_severity",
    "ATTACK_TECHNIQUE_SEVERITY",
    "SEVERITY_CONTEXT_MULTIPLIERS",
    "ClassificationRules",
]
