"""SecAlert 误报率统计

计算和展示误报率指标
Phase 3 指标统计模块
"""

import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta

from src.graph.client import Neo4jClient


logger = logging.getLogger(__name__)


@dataclass
class FalsePositiveMetrics:
    """误报率指标"""

    fp_rate: float              # 误报率（小数）
    fp_rate_percent: float     # 误报率（百分比）
    total_chains: int           # 总链数
    false_positives: int       # 误报数
    true_positives: int         # 真实攻击数
    target_met: bool            # 是否达到 <30% 目标
    time_window_hours: int      # 统计时间窗口
    calculated_at: str           # 计算时间


class FalsePositiveMetricsCollector:
    """误报率指标收集器

    从 Neo4j 读取链状态统计数据
    计算误报率等关键指标
    """

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.neo4j = neo4j_client or Neo4jClient()

    def calculate_fp_rate(
        self,
        time_window_hours: int = 24
    ) -> FalsePositiveMetrics:
        """计算误报率

        Args:
            time_window_hours: 统计时间窗口（小时）

        Returns:
            FalsePositiveMetrics 指标对象
        """
        # 获取所有链
        all_chains = self._get_chains_in_window(time_window_hours)

        total = len(all_chains)
        if total == 0:
            return FalsePositiveMetrics(
                fp_rate=0.0,
                fp_rate_percent=0.0,
                total_chains=0,
                false_positives=0,
                true_positives=0,
                target_met=True,
                time_window_hours=time_window_hours,
                calculated_at=datetime.now().isoformat()
            )

        # 统计各状态数量
        fp_count = sum(1 for c in all_chains if c.get("status") == "false_positive")
        tp_count = sum(1 for c in all_chains if c.get("status") == "active")

        fp_rate = fp_count / total
        fp_rate_percent = fp_rate * 100

        return FalsePositiveMetrics(
            fp_rate=round(fp_rate, 3),
            fp_rate_percent=round(fp_rate_percent, 1),
            total_chains=total,
            false_positives=fp_count,
            true_positives=tp_count,
            target_met=fp_rate < 0.30,
            time_window_hours=time_window_hours,
            calculated_at=datetime.now().isoformat()
        )

    def _get_chains_in_window(
        self,
        time_window_hours: int
    ) -> List[Dict[str, Any]]:
        """获取时间窗口内的所有链"""
        # 简化实现：获取最近的 limit 条链
        # 实际生产环境应按时间范围过滤
        chains = self.neo4j.list_chains(limit=1000, status=None)
        return chains

    def get_severity_distribution(
        self,
        status: Optional[str] = "active"
    ) -> Dict[str, int]:
        """获取严重度分布

        Args:
            status: 过滤状态，None 表示所有状态

        Returns:
            严重度分布字典 {"critical": N, "high": N, "medium": N, "low": N}
        """
        chains = self.neo4j.list_chains(limit=1000, status=status)

        # 简化：基于 max_severity 统计
        # 实际应从链的 severity 标签字段读取
        distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}

        for chain in chains:
            max_sev = chain.get("max_severity", 0)
            if max_sev >= 80:
                distribution["critical"] += 1
            elif max_sev >= 60:
                distribution["high"] += 1
            elif max_sev >= 40:
                distribution["medium"] += 1
            else:
                distribution["low"] += 1

        return distribution

    def get_suppression_log(
        self,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """获取抑制日志

        用于审计和误报分析

        Args:
            limit: 返回条数

        Returns:
            抑制日志列表
        """
        # 获取误报链作为抑制日志
        chains = self.neo4j.list_chains(limit=limit, status="false_positive")

        log_entries = []
        for chain in chains:
            log_entries.append({
                "chain_id": chain.get("chain_id"),
                "suppressed_at": chain.get("updated_at", chain.get("created_at")),
                "reason": "confidence < 0.5",  # 简化，应从链属性读取
                "alert_count": chain.get("alert_count", 0)
            })

        return log_entries

    def to_dict(self, metrics: FalsePositiveMetrics) -> Dict[str, Any]:
        """将指标对象转换为字典"""
        return {
            "fp_rate": metrics.fp_rate,
            "fp_rate_percent": metrics.fp_rate_percent,
            "total_chains": metrics.total_chains,
            "false_positives": metrics.false_positives,
            "true_positives": metrics.true_positives,
            "target_met": metrics.target_met,
            "time_window_hours": metrics.time_window_hours,
            "calculated_at": metrics.calculated_at
        }
