"""预置分类规则

已知误报模式和已知攻击模式的快速判断规则
规则优先策略的第一层高速处理
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class ClassificationRule:
    """单条分类规则"""
    name: str
    description: str
    # 判断结果（无默认值的字段在前）
    is_attack: bool
    confidence: float  # 0.0-1.0
    # 匹配条件（有默认值的字段在后）
    alert_signatures: Optional[List[str]] = None  # 匹配的告警签名
    technique_ids: Optional[List[str]] = None     # 匹配的 ATT&CK technique
    severity: str = "medium"


class ClassificationRules:
    """预置分类规则库

    包含两类规则：
    1. 已知误报模式（如定期扫描、内部维护流量）
    2. 已知攻击模式（如已知恶意软件行为）
    """

    def __init__(self):
        self._rules: List[ClassificationRule] = self._load_builtin_rules()

    def _load_builtin_rules(self) -> List[ClassificationRule]:
        """加载内置规则"""
        rules = []

        # ========== 已知误报模式 ==========
        rules.append(ClassificationRule(
            name="internal_maintenance",
            description="内部维护流量（已知 IP 段定期扫描）",
            alert_signatures=["SCAN", "NMAP", "PORT_SCAN"],
            is_attack=False,
            confidence=0.98,
            severity="low"
        ))

        rules.append(ClassificationRule(
            name="false_positive_auth_failure",
            description="误报：认证失败（内部用户错误密码）",
            alert_signatures=["AUTH_FAILURE", "LOGIN_FAILED", "INVALID_CREDENTIALS"],
            is_attack=False,
            confidence=0.85,
            severity="low"
        ))

        # ========== 已知攻击模式 ==========
        rules.append(ClassificationRule(
            name="已知恶意软件_cobalt_strike",
            description="Cobalt Strike C2 通信特征",
            alert_signatures=["COBALT_STRIKE", "BEACON", "C2"],
            is_attack=True,
            confidence=0.97,
            severity="critical"
        ))

        rules.append(ClassificationRule(
            name="已知攻击_ransomware",
            description="勒索软件行为特征",
            alert_signatures=["RANSOMWARE", "FILE_ENCRYPTION", "WANNACRY"],
            is_attack=True,
            confidence=0.95,
            severity="critical"
        ))

        rules.append(ClassificationRule(
            name="lateral_movement_smb",
            description="SMB 横向移动尝试",
            alert_signatures=["SMB_ATTACK", "SMB_EXPLOIT", "ETERNALBLUE"],
            is_attack=True,
            confidence=0.92,
            severity="high"
        ))

        return rules

    def check(self, chain_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """检查攻击链是否匹配任何预置规则

        Args:
            chain_data: 攻击链数据（包含 alerts 列表等）

        Returns:
            匹配结果（包含 is_attack, confidence, rule_name 等），
            如果无匹配返回 None
        """
        alerts = chain_data.get("alerts", [])
        if not alerts:
            return None

        # 收集链中所有告警签名和 technique
        chain_signatures = set()
        chain_techniques = set()

        for alert in alerts:
            if sig := alert.get("alert_signature"):
                chain_signatures.add(sig.upper())
            if tech := alert.get("mitre_technique_id"):
                chain_techniques.add(tech.upper())

        # 遍历规则检查匹配
        for rule in self._rules:
            # 检查告警签名匹配
            sig_match = False
            if rule.alert_signatures:
                for sig in rule.alert_signatures:
                    if sig.upper() in chain_signatures:
                        sig_match = True
                        break

            # 检查 technique 匹配
            tech_match = False
            if rule.technique_ids:
                for tech in rule.technique_ids:
                    if tech.upper() in chain_techniques:
                        tech_match = True
                        break

            # 至少一个维度匹配
            if sig_match or tech_match:
                return {
                    "is_attack": rule.is_attack,
                    "confidence": rule.confidence,
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "matched_by": "signature" if sig_match else "technique"
                }

        return None

    def add_rule(self, rule: ClassificationRule) -> None:
        """动态添加规则（运行时扩展）"""
        self._rules.append(rule)

    def get_rules(self) -> List[Dict[str, Any]]:
        """获取所有规则列表（用于调试/展示）"""
        return [
            {
                "name": r.name,
                "description": r.description,
                "is_attack": r.is_attack,
                "confidence": r.confidence,
                "severity": r.severity
            }
            for r in self._rules
        ]
