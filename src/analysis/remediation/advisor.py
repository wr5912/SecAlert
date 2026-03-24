"""处置建议生成器

规则优先 + LLM 兜底的处置建议生成
Per D-01: 预置 ATT&CK 处置建议模板库 + Qwen3-32B 生成
Per D-02: 混合内容风格 - 核心行动一行 + 可展开详细说明
Per D-03: 建议必须引用具体资产信息
占位文件，完整实现见 Task 6
"""

from typing import Dict, Any, Optional, List

from .templates import RemediationTemplates, DEFAULT_TEMPLATE_FILE
from .timeline import simplify_chain_timeline


class RemediationAdvisor:
    """处置建议生成器 - Stub 实现

    完整实现见 Task 6
    """

    def __init__(self, template_file: str = DEFAULT_TEMPLATE_FILE, lm=None):
        self.templates = RemediationTemplates(template_file)
        self.lm = lm

    def get_recommendation(self, chain_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取处置建议 - Stub"""
        technique_ids = self._extract_techniques(chain_data)
        for tech_id in technique_ids:
            if self.templates.has_template(tech_id):
                template = self.templates.get_template(tech_id)
                recommendation = self.templates.apply_template(template, chain_data)
                recommendation["technique_id"] = tech_id
                return recommendation
        return {"short_action": "检查安全日志", "detailed_steps": [], "source": "stub"}

    def _extract_techniques(self, chain_data: Dict[str, Any]) -> List[str]:
        """从攻击链提取 technique_id 列表"""
        technique_ids = []
        seen = set()
        for alert in chain_data.get("alerts", []):
            tech_id = alert.get("mitre_technique_id")
            if tech_id and tech_id not in seen:
                technique_ids.append(tech_id)
                seen.add(tech_id)
        return technique_ids

    def get_timeline(self, chain_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取简化时间线"""
        return simplify_chain_timeline(chain_data)
