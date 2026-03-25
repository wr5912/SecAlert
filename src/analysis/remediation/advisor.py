"""处置建议生成器

规则优先 + LLM 兜底的处置建议生成
Per D-01: 预置 ATT&CK 处置建议模板库 + Qwen3-32B 生成
Per D-02: 混合内容风格 - 核心行动一行 + 可展开详细说明
Per D-03: 建议必须引用具体资产信息
"""

from typing import Dict, Any, Optional, List

from .templates import RemediationTemplates, DEFAULT_TEMPLATE_FILE
from .timeline import simplify_chain_timeline

# 检测 dspy-ai
DSPY_AVAILABLE = False
try:
    import dspy
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
except ImportError:
    dspy = None

from .signatures import RemediationRecommendationSignature


class RemediationAdvisor:
    """处置建议生成器

    规则优先 + LLM 兜底策略：
    1. 从 chain_data 提取 technique_id
    2. 模板查找（命中则填充资产信息返回）
    3. LLM 生成（模板未命中时）

    输出格式 (per D-02):
    - short_action: 一行核心行动（必含资产信息）
    - detailed_steps: 详细步骤列表
    - attck_ref: ATT&CK 引用（可选显示）
    - source: "template" 或 "llm"
    """

    def __init__(self, template_file: str = DEFAULT_TEMPLATE_FILE, lm=None):
        self.templates = RemediationTemplates(template_file)
        self.lm = lm
        self._llm_program = None

        # 初始化 DSPy LLM 程序
        if DSPY_AVAILABLE and self.lm:
            dspy.settings.configure(lm=self.lm)
            self._llm_program = dspy.ChainOfThought(RemediationRecommendationSignature)

    def get_recommendation(self, chain_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取处置建议

        Args:
            chain_data: 攻击链完整数据（来自 Neo4j）

        Returns:
            处置建议字典，包含 short_action, detailed_steps, attck_ref, source
        """
        # 1. 提取 technique_id 列表
        technique_ids = self._extract_techniques(chain_data)

        # 2. 模板查找
        for tech_id in technique_ids:
            if self.templates.has_template(tech_id):
                template = self.templates.get_template(tech_id)
                recommendation = self.templates.apply_template(template, chain_data)
                recommendation["technique_id"] = tech_id
                return recommendation

        # 3. LLM 生成（模板未命中）
        if technique_ids:
            return self._llm_generate(chain_data, technique_ids[0])
        else:
            # 无 technique 信息，使用通用建议
            return self._llm_generate(chain_data, "unknown")

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

    def _llm_generate(
        self,
        chain_data: Dict[str, Any],
        technique_id: str
    ) -> Dict[str, Any]:
        """使用 LLM 生成处置建议

        当模板未命中时调用此方法

        Args:
            chain_data: 攻击链数据
            technique_id: ATT&CK technique ID

        Returns:
            LLM 生成的处置建议
        """
        # 提取资产上下文
        asset_context = self._build_asset_context(chain_data)

        if DSPY_AVAILABLE and self._llm_program:
            # DSPy LLM 生成
            result = self._llm_program(
                chain_data=chain_data,
                technique_id=technique_id,
                asset_context=asset_context
            )
            return {
                "short_action": result.short_action,
                "detailed_steps": result.detailed_steps if isinstance(result.detailed_steps, list) else [result.detailed_steps],
                "attck_ref": result.attck_ref,
                "source": "llm",
                "technique_id": technique_id
            }
        else:
            # Stub: 返回通用建议
            return self._generic_recommendation(chain_data, technique_id)

    def _build_asset_context(self, chain_data: Dict[str, Any]) -> str:
        """构建资产上下文描述"""
        parts = []

        if chain_data.get("asset_ip"):
            parts.append(f"资产IP: {chain_data['asset_ip']}")

        src_ips = set()
        dst_ips = set()
        ports = set()

        for alert in chain_data.get("alerts", []):
            if alert.get("src_ip"):
                src_ips.add(alert["src_ip"])
            if alert.get("dst_ip"):
                dst_ips.add(alert["dst_ip"])
            if alert.get("port"):
                ports.add(str(alert["port"]))

        if src_ips:
            parts.append(f"源IP: {', '.join(list(src_ips)[:3])}")
        if dst_ips:
            parts.append(f"目标IP: {', '.join(list(dst_ips)[:3])}")
        if ports:
            parts.append(f"端口: {', '.join(list(ports)[:5])}")

        return "; ".join(parts) if parts else "无详细信息"

    def _generic_recommendation(
        self,
        chain_data: Dict[str, Any],
        technique_id: str
    ) -> Dict[str, Any]:
        """当无模板且无 LLM 时返回通用建议"""
        src_ip = chain_data.get("alerts", [{}])[0].get("src_ip", "未知") if chain_data.get("alerts") else "未知"
        asset_ip = chain_data.get("asset_ip", "未知")

        return {
            "short_action": f"检查 {asset_ip} 的安全日志，确认来自 {src_ip} 的可疑活动",
            "detailed_steps": [
                "1. 查看防火墙/IDS 日志",
                "2. 确认攻击行为是否成功",
                "3. 如确认入侵，封锁可疑 IP",
                "4. 通知安全团队"
            ],
            "attck_ref": f"{technique_id} - 未知技术",
            "source": "generic",
            "technique_id": technique_id
        }

    def get_timeline(self, chain_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取简化时间线

        Args:
            chain_data: 攻击链数据

        Returns:
            简化时间线（来自 timeline.py）
        """
        return simplify_chain_timeline(chain_data)

    def generate_recommendation_nl(self, chain_data: Dict[str, Any]) -> str:
        """生成自然语言处置建议

        Args:
            chain_data: 攻击链数据，包含 alerts, severity 等

        Returns:
            自然语言描述的处置建议
        """
        # 获取建议 - get_recommendation 返回直接包含 short_action, detailed_steps, attck_ref 的字典
        recommendation = self.get_recommendation(chain_data)

        # 构建自然语言响应
        severity = chain_data.get("max_severity", "medium").upper()
        chain_id = chain_data.get("chain_id", "unknown")

        response = f"针对攻击链 {chain_id[:8]}...（严重度: {severity}）\n\n"

        # recommendation 是直接包含建议字段的字典，不是 {"recommendation": {...}}
        response += f"**建议**: {recommendation.get('short_action', '进行安全调查')}\n\n"

        steps = recommendation.get("detailed_steps", [])
        if steps:
            response += "**处置步骤**:\n"
            for i, step in enumerate(steps, 1):
                response += f"{i}. {step}\n"

        attck_ref = recommendation.get("attck_ref", "")
        if attck_ref and attck_ref != "N/A":
            response += f"\n**相关威胁**: {attck_ref}"

        return response
