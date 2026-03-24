"""处置建议生成模块

规则优先 + LLM 兜底策略生成通俗易懂的处置建议
Phase 4 核心模块
"""

from .advisor import RemediationAdvisor
from .timeline import simplify_chain_timeline

__all__ = ["RemediationAdvisor", "simplify_chain_timeline"]
