"""
ATT&CK 映射器 - 规则优先 + LLM 兜底

将告警映射到 MITRE ATT&CK 战术(Tactic)和技术(Technique)
规则文件: rules/attck_suricata.yaml
"""

import yaml
import os
from typing import Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class AttackMapping:
    """ATT&CK 映射结果"""
    tactic: Optional[str] = None
    technique_id: Optional[str] = None
    technique_name: Optional[str] = None
    confidence: float = 0.0
    source: str = "rule"  # "rule" or "llm"


class AttackChainMapper:
    """规则优先 + LLM 兜底的 ATT&CK 映射器"""

    def __init__(self, rule_file: str = "rules/attck_suricata.yaml", llm_fallback: bool = True):
        self.llm_fallback = llm_fallback
        self.rule_table: Dict[str, Dict[str, str]] = {}
        self._load_rules(rule_file)

        # LLM fallback 导入 (延迟加载避免循环依赖)
        self._llm_program = None

    def _load_rules(self, rule_file: str) -> None:
        """从 YAML 文件加载 ATT&CK 映射规则"""
        if not os.path.exists(rule_file):
            print(f"Warning: ATT&CK rule file {rule_file} not found, using empty rules")
            return

        with open(rule_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if data and "rules" in data:
            self.rule_table = data["rules"]

    def map_to_attack(self, alert: Dict[str, Any]) -> AttackMapping:
        """
        将告警映射到 ATT&CK 战术和技术

        Args:
            alert: OCSF 格式告警，包含 alert_signature 字段

        Returns:
            AttackMapping 对象
        """
        alert_signature = alert.get("alert_signature", "") or alert.get("event_type", "")

        # Layer 1: 预置规则查找
        if mapping := self.rule_table.get(alert_signature):
            return AttackMapping(
                tactic=mapping.get("tactic"),
                technique_id=mapping.get("technique_id"),
                technique_name=mapping.get("technique_name"),
                confidence=0.95,
                source="rule"
            )

        # Layer 2: LLM 兜底推断
        if self.llm_fallback:
            return self._llm_infer(alert, alert_signature)

        # 无匹配且不使用 LLM
        return AttackMapping(
            tactic=None,
            technique_id=None,
            technique_name=None,
            confidence=0.0,
            source="none"
        )

    def _llm_infer(self, alert: Dict[str, Any], alert_signature: str) -> AttackMapping:
        """使用 LLM 推断 ATT&CK 映射 (Qwen3-32B)"""
        # 延迟加载 LLM 程序避免循环导入
        if self._llm_program is None:
            try:
                from parser.dspy.programs.log_parser import LogParserProgram
                # 使用 LogParserProgram 作为 LLM 调用载体
                self._llm_program = LogParserProgram()
            except ImportError:
                return AttackMapping(
                    tactic=None,
                    technique_id=None,
                    technique_name=None,
                    confidence=0.0,
                    source="llm_error"
                )

        prompt = self._build_llm_prompt(alert, alert_signature)

        try:
            # 调用 LLM 推理
            result = self._llm_program.predict(prompt=prompt)
            parsed = self._parse_llm_response(result)

            if parsed:
                return AttackMapping(
                    tactic=parsed.get("tactic"),
                    technique_id=parsed.get("technique_id"),
                    technique_name=parsed.get("technique_name"),
                    confidence=0.7,  # LLM 推断置信度较低
                    source="llm"
                )
        except Exception as e:
            print(f"LLM inference failed: {e}")

        return AttackMapping(
            tactic=None,
            technique_id=None,
            technique_name=None,
            confidence=0.0,
            source="llm_error"
        )

    def _build_llm_prompt(self, alert: Dict[str, Any], alert_signature: str) -> str:
        """构建 LLM 推理提示词"""
        import json
        return f"""分析以下安全告警，返回可能的 MITRE ATT&CK 战术和技术。

告警类型: {alert_signature}
告警详情: {json.dumps(alert, ensure_ascii=False, indent=2)}

只返回 JSON 格式（无其他内容）:
{{"tactic": "TA0001", "technique_id": "T1190", "technique_name": "Exploit Public-Facing Application"}}

如果无法确定，返回:
{{"tactic": null, "technique_id": null, "technique_name": null}}"""

    def _parse_llm_response(self, response: str) -> Optional[Dict[str, str]]:
        """解析 LLM 返回的 JSON 响应"""
        import json
        import re

        try:
            # 尝试提取 JSON
            match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

        return None

    def get_tactic_name(self, tactic_id: str) -> str:
        """将 Tactic ID 转换为名称"""
        tactic_names = {
            "TA0001": "Initial Access",
            "TA0002": "Execution",
            "TA0003": "Persistence",
            "TA0004": "Privilege Escalation",
            "TA0005": "Defense Evasion",
            "TA0006": "Credential Access",
            "TA0007": "Discovery",
            "TA0008": "Lateral Movement",
            "TA0009": "Collection",
            "TA0010": "Exfiltration",
            "TA0011": "Command and Control",
            "TA0043": "Reconnaissance"
        }
        return tactic_names.get(tactic_id, tactic_id)