"""
告警关联器

使用动态时间窗口 + 规则引擎关联相关告警
"""

from typing import Dict, Any, List, Tuple, Optional, Set
from dataclasses import dataclass, field
from collections import defaultdict
import time

from ..window.adaptive_window import AdaptiveWindow
from ..mitre.mapper import AttackChainMapper
from .dsl import CorrelationRule


@dataclass
class AlertCorrelation:
    """告警关联结果"""
    alert_a_id: str
    alert_b_id: str
    correlation_type: str  # "ip", "asset", "type"
    confidence: float
    window_seconds: int


@dataclass
class CorrelatedGroup:
    """关联告警组"""
    group_id: str
    alert_ids: List[str]
    correlation_type: str
    start_time: float
    end_time: float
    window_seconds: int
    alerts: List[Dict[str, Any]] = field(default_factory=list)


class AlertCorrelator:
    """
    告警关联器

    使用动态时间窗口和规则引擎关联相关告警
    """

    def __init__(
        self,
        attck_mapper: Optional[AttackChainMapper] = None,
        window: Optional[AdaptiveWindow] = None
    ):
        self.attck_mapper = attck_mapper or AttackChainMapper(llm_fallback=False)
        self.window = window or AdaptiveWindow()

        # 关联规则列表
        self.rules: List[CorrelationRule] = []
        self._load_default_rules()

        # 内部状态: 按 src_ip 分组的告警
        self._alert_buffer: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def _load_default_rules(self) -> None:
        """加载默认关联规则"""
        # 规则1: IP 相同 + ATT&CK 阶段递进
        self.rules.append(CorrelationRule(
            name="IP + ATTCK progression",
            conditions=[
                {"field": "src_ip", "operator": "same_ip_pair", "weight": 1.0},
                {"field": "mitre_tactic", "operator": "attck_stage_progression", "weight": 2.0}
            ],
            min_alerts=2
        ))

        # 规则2: 相同目标资产
        self.rules.append(CorrelationRule(
            name="Same target asset",
            conditions=[
                {"field": "dst_ip", "operator": "same_ip_pair", "weight": 1.0}
            ],
            min_alerts=2
        ))

        # 规则3: 相同攻击类型
        self.rules.append(CorrelationRule(
            name="Same attack type",
            conditions=[
                {"field": "alert_signature", "operator": "same_attack_type", "weight": 1.0},
                {"field": "dst_ip", "operator": "same_ip_pair", "weight": 1.0}
            ],
            min_alerts=3
        ))

    def add_alert(self, alert: Dict[str, Any]) -> List[CorrelatedGroup]:
        """
        添加告警并进行关联

        Args:
            alert: OCSF 格式告警

        Returns:
            新形成的关联组列表
        """
        # 如果没有 ATT&CK 映射，先进行映射
        if not alert.get("mitre_tactic"):
            mapping = self.attck_mapper.map_to_attack(alert)
            alert["mitre_tactic"] = mapping.tactic
            alert["mitre_technique_id"] = mapping.technique_id
            alert["mitre_technique_name"] = mapping.technique_name

        # 记录告警到时间窗口
        timestamp = self._parse_timestamp(alert.get("timestamp"))
        self.window.record_alert(timestamp)

        # 获取当前窗口大小
        current_window = self.window.compute_window(timestamp)
        alert["_window_seconds"] = current_window
        alert["_timestamp"] = timestamp

        # 按源 IP 分组
        src_ip = alert.get("src_ip")
        if not src_ip:
            return []

        self._alert_buffer[src_ip].append(alert)

        # 清理过期告警
        self._cleanup_buffer(src_ip, timestamp, current_window)

        # 执行关联
        return self._correlate_group(src_ip)

    def _correlate_group(self, src_ip: str) -> List[CorrelatedGroup]:
        """对指定 IP 的告警组执行关联"""
        alerts = self._alert_buffer[src_ip]
        if len(alerts) < 2:
            return []

        new_groups = []
        correlated_pairs: Set[Tuple[str, str]] = set()

        # 检查每对告警
        for i, alert_a in enumerate(alerts):
            for alert_b in alerts[i+1:]:
                # 检查是否在窗口内
                time_diff = alert_b["_timestamp"] - alert_a["_timestamp"]
                if time_diff > alert_a.get("_window_seconds", 3600):
                    continue

                # 尝试每条规则
                for rule in self.rules:
                    matched, confidence = rule.matches(alert_a, alert_b)
                    if matched:
                        pair = tuple(sorted([alert_a["event_id"], alert_b["event_id"]]))
                        if pair not in correlated_pairs:
                            correlated_pairs.add(pair)

                        new_groups.append(CorrelatedGroup(
                            group_id=f"group_{alert_a['event_id'][:8]}_{alert_b['event_id'][:8]}",
                            alert_ids=[alert_a["event_id"], alert_b["event_id"]],
                            correlation_type=rule.name,
                            start_time=min(alert_a["_timestamp"], alert_b["_timestamp"]),
                            end_time=max(alert_a["_timestamp"], alert_b["_timestamp"]),
                            window_seconds=int(time_diff),
                            alerts=[alert_a, alert_b]
                        ))

        return new_groups

    def _cleanup_buffer(self, src_ip: str, now: float, window_seconds: int) -> None:
        """清理过期的告警"""
        cutoff = now - window_seconds
        self._alert_buffer[src_ip] = [
            a for a in self._alert_buffer[src_ip]
            if a["_timestamp"] >= cutoff
        ]

    def _parse_timestamp(self, timestamp: Any) -> float:
        """解析时间戳为 float"""
        if isinstance(timestamp, (int, float)):
            return timestamp
        if isinstance(timestamp, str):
            from dateutil.parser import parse
            return parse(timestamp).timestamp()
        return time.time()

    def get_groups(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取当前所有关联组"""
        return dict(self._alert_buffer)

    def reset(self) -> None:
        """重置关联器状态"""
        self._alert_buffer.clear()
        self.window.reset()
