"""
关联规则 DSL 解释器

支持以下操作符:
- equals: 字段值相等
- same_ip_pair: 源IP或目标IP相同
- same_attack_type: 攻击类型相同
- attck_stage_progression: ATT&CK 阶段递进验证
"""

from typing import Dict, Any, Tuple, List, Optional
from dataclasses import dataclass


@dataclass
class CorrelationRule:
    """
    关联规则，支持复合条件

    属性:
        name: 规则名称
        conditions: 条件列表 [{field, operator, value, weight}]
        min_alerts: 形成关联所需最小告警数
    """
    name: str
    conditions: List[Dict[str, Any]]
    min_alerts: int = 2

    # ATT&CK 阶段优先级 (用于阶段递进验证)
    ATTACK_STAGES = [
        "reconnaissance",        # 侦察
        "initial_access",        # 初始访问
        "execution",            # 执行
        "persistence",          # 持久化
        "privilege_escalation", # 权限提升
        "defense_evasion",      # 防御规避
        "credential_access",    # 凭证访问
        "discovery",            # 发现
        "lateral_movement",     # 横向移动
        "collection",           # 收集
        "exfiltration",         # 泄露
        "command_and_control",  # 命令与控制
        "impact"               # 影响
    ]

    def matches(self, alert_a: Dict[str, Any], alert_b: Dict[str, Any]) -> Tuple[bool, float]:
        """
        检查两条告警是否满足关联条件

        Args:
            alert_a: 第一条告警
            alert_b: 第二条告警

        Returns:
            (是否关联, 置信度)
        """
        satisfied_weight = 0.0
        total_weight = 0.0

        for cond in self.conditions:
            field = cond.get("field")
            operator = cond.get("operator")
            value = cond.get("value")
            weight = cond.get("weight", 1.0)
            total_weight += weight

            if not self._evaluate_condition(alert_a, alert_b, field, operator, value):
                continue

            satisfied_weight += weight

        if total_weight == 0:
            return False, 0.0

        confidence = satisfied_weight / total_weight
        # 至少满足 50% 条件权重才算关联
        return satisfied_weight >= total_weight * 0.5, confidence

    def _evaluate_condition(
        self,
        alert_a: Dict[str, Any],
        alert_b: Dict[str, Any],
        field: str,
        operator: str,
        value: Any
    ) -> bool:
        """评估单个条件"""
        val_a = alert_a.get(field)
        val_b = alert_b.get(field)

        if operator == "equals":
            return val_a == val_b

        elif operator == "same_ip_pair":
            # 源IP相同或目标IP相同
            src_same = alert_a.get("src_ip") == alert_b.get("src_ip")
            dst_same = alert_a.get("dst_ip") == alert_b.get("dst_ip")
            return src_same or dst_same

        elif operator == "same_attack_type":
            # 攻击类型相同 (alert_signature 或 event_type)
            type_a = alert_a.get("alert_signature") or alert_a.get("event_type", "")
            type_b = alert_b.get("alert_signature") or alert_b.get("event_type", "")
            return type_a == type_b

        elif operator == "attck_stage_progression":
            # ATT&CK 阶段递进验证 (后续阶段 > 之前阶段)
            tactic_a = alert_a.get("mitre_tactic", "")
            tactic_b = alert_b.get("mitre_tactic", "")
            return self._valid_attack_progression(tactic_a, tactic_b)

        elif operator == "same_target":
            # 目标相同 (IP 或主机名)
            ip_a = alert_a.get("dst_ip")
            ip_b = alert_b.get("dst_ip")
            hostname_a = alert_a.get("dst_hostname", "")
            hostname_b = alert_b.get("dst_hostname", "")
            return ip_a == ip_b or hostname_a == hostname_b

        return False

    def _valid_attack_progression(self, tactic_a: str, tactic_b: str) -> bool:
        """
        验证 ATT&CK 阶段是否合理递进

        规则: 后续阶段可以在之前阶段之后，但不允许倒退
        例如: 扫描 -> 利用 -> 权限提升 (合理)
              权限提升 -> 扫描 (不合理)
        """
        if not tactic_a or not tactic_b:
            return True  # 缺少 ATT&CK 标签时跳过验证

        try:
            stage_a = self._get_stage_priority(tactic_a)
            stage_b = self._get_stage_priority(tactic_b)
            # 允许相同阶段或后续阶段
            return stage_b >= stage_a
        except ValueError:
            return True  # 未知 tactic 跳过验证

    def _get_stage_priority(self, tactic: str) -> int:
        """获取 tactic 对应的阶段优先级"""
        # tactic 可能是 "TA0004" 或 "Privilege Escalation"
        tactic_normalized = tactic.lower().replace("_", " ").replace("-", " ")

        for i, stage in enumerate(self.ATTACK_STAGES):
            if stage in tactic_normalized or tactic_normalized in stage:
                return i

        # 尝试匹配 TAxxxx 格式
        import re
        match = re.search(r'TA(\d+)', tactic)
        if match:
            ta_num = int(match.group(1))
            # TA0001-TA0011 对应的索引 (大致按攻击链顺序)
            ta_to_stage = {
                43: 0,   # TA0043 Reconnaissance
                1: 1,    # TA0001 Initial Access
                2: 2,    # TA0002 Execution
                3: 3,    # TA0003 Persistence
                4: 4,    # TA0004 Privilege Escalation
                5: 5,    # TA0005 Defense Evasion
                6: 6,    # TA0006 Credential Access
                7: 7,    # TA0007 Discovery
                8: 8,    # TA0008 Lateral Movement
                9: 9,    # TA0009 Collection
                11: 10,  # TA0011 Command and Control
                10: 11,  # TA0010 Exfiltration
            }
            return ta_to_stage.get(ta_num, 0)

        raise ValueError(f"Unknown tactic: {tactic}")
