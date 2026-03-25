"""报表数据聚合器

从 Neo4j 聚合告警数据，生成日报/周报所需指标
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from src.graph.client import Neo4jClient

logger = logging.getLogger(__name__)


@dataclass
class DailyMetrics:
    """日报指标数据"""
    date: str
    total_alerts: int
    total_chains: int
    true_positives: int
    false_positives: int
    fp_rate: float
    severity_distribution: Dict[str, int]
    top_attack_types: List[Dict[str, Any]]


class ReportAggregator:
    """报表数据聚合器

    从 Neo4j 聚合告警数据，生成日报/周报所需指标
    """

    def __init__(self, neo4j_client: Optional[Neo4jClient] = None):
        self.neo4j = neo4j_client or Neo4jClient()

    def collect_daily_metrics(self, date: datetime) -> DailyMetrics:
        """收集指定日期的指标数据

        Args:
            date: 要收集的日期

        Returns:
            DailyMetrics 指标对象
        """
        # 获取指定日期范围内的链
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        chains = self._get_chains_in_range(start_of_day, end_of_day)

        total_chains = len(chains)
        if total_chains == 0:
            return DailyMetrics(
                date=date.strftime("%Y-%m-%d"),
                total_alerts=0,
                total_chains=0,
                true_positives=0,
                false_positives=0,
                fp_rate=0.0,
                severity_distribution={"critical": 0, "high": 0, "medium": 0, "low": 0},
                top_attack_types=[]
            )

        # 统计各状态数量
        true_positives = sum(1 for c in chains if c.get("status") == "active")
        false_positives = sum(1 for c in chains if c.get("status") == "false_positive")

        # 计算误报率
        fp_rate = false_positives / total_chains if total_chains > 0 else 0.0

        # 统计严重度分布
        severity_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        total_alerts = 0
        attack_type_counts: Dict[str, int] = {}

        for chain in chains:
            max_sev = chain.get("max_severity", 0)
            total_alerts += chain.get("alert_count", 0)

            if max_sev >= 80:
                severity_dist["critical"] += 1
            elif max_sev >= 60:
                severity_dist["high"] += 1
            elif max_sev >= 40:
                severity_dist["medium"] += 1
            else:
                severity_dist["low"] += 1

            # 统计攻击类型
            technique = chain.get("mitre_technique_name") or chain.get("mitre_technique_id") or "unknown"
            attack_type_counts[technique] = attack_type_counts.get(technique, 0) + 1

        # 获取 Top 攻击类型
        top_attack_types = sorted(
            [{"type": k, "count": v} for k, v in attack_type_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:5]

        return DailyMetrics(
            date=date.strftime("%Y-%m-%d"),
            total_alerts=total_alerts,
            total_chains=total_chains,
            true_positives=true_positives,
            false_positives=false_positives,
            fp_rate=round(fp_rate, 3),
            severity_distribution=severity_dist,
            top_attack_types=top_attack_types
        )

    def collect_weekly_metrics(self, start_date: datetime) -> Dict[str, Any]:
        """收集指定周的指标数据 (周一到周日)

        Args:
            start_date: 周的起始日期 (周一)

        Returns:
            周报数据字典
        """
        # 确保 start_date 是周一
        days_since_monday = start_date.weekday()
        monday = start_date - timedelta(days=days_since_monday)

        daily_breakdown = []
        total_alerts = 0
        total_chains = 0
        total_true_positives = 0
        total_false_positives = 0
        severity_totals = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        attack_type_counts: Dict[str, int] = {}

        for i in range(7):
            day = monday + timedelta(days=i)
            daily = self.collect_daily_metrics(day)
            daily_breakdown.append({
                "date": daily.date,
                "total_alerts": daily.total_alerts,
                "total_chains": daily.total_chains,
                "true_positives": daily.true_positives,
                "false_positives": daily.false_positives,
                "fp_rate": daily.fp_rate
            })

            total_alerts += daily.total_alerts
            total_chains += daily.total_chains
            total_true_positives += daily.true_positives
            total_false_positives += daily.false_positives

            for sev, count in daily.severity_distribution.items():
                severity_totals[sev] += count

            for attack in daily.top_attack_types:
                attack_type_counts[attack["type"]] = attack_type_counts.get(attack["type"], 0) + attack["count"]

        # 计算周平均误报率
        fp_rate = total_false_positives / total_chains if total_chains > 0 else 0.0

        # 获取 Top 攻击类型
        top_attack_types = sorted(
            [{"type": k, "count": v} for k, v in attack_type_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]

        return {
            "week_start": monday.strftime("%Y-%m-%d"),
            "week_end": (monday + timedelta(days=6)).strftime("%Y-%m-%d"),
            "total_alerts": total_alerts,
            "total_chains": total_chains,
            "true_positives": total_true_positives,
            "false_positives": total_false_positives,
            "fp_rate": round(fp_rate, 3),
            "severity_distribution": severity_totals,
            "top_attack_types": top_attack_types,
            "daily_breakdown": daily_breakdown
        }

    def get_trends(self, days: int) -> List[Dict[str, Any]]:
        """获取每日趋势数据 (用于图表)

        Args:
            days: 获取最近 N 天的数据

        Returns:
            趋势数据列表 [{"date": "2026-03-20", "total": 150, "false_positives": 45, "true_positives": 105}, ...]
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        chains = self._get_chains_in_range(start_date, end_date)

        # 按日期分组
        daily_data: Dict[str, Dict[str, int]] = {}

        for chain in chains:
            # 提取日期
            start_time = chain.get("start_time")
            if start_time:
                if isinstance(start_time, str):
                    date_str = start_time[:10]  # 取 YYYY-MM-DD 部分
                else:
                    date_str = start_time.strftime("%Y-%m-%d")
            else:
                date_str = end_date.strftime("%Y-%m-%d")

            if date_str not in daily_data:
                daily_data[date_str] = {
                    "total": 0,
                    "true_positives": 0,
                    "false_positives": 0
                }

            daily_data[date_str]["total"] += 1

            if chain.get("status") == "active":
                daily_data[date_str]["true_positives"] += 1
            elif chain.get("status") == "false_positive":
                daily_data[date_str]["false_positives"] += 1

        # 转换为列表并排序
        trends = [
            {
                "date": date,
                "total": data["total"],
                "true_positives": data["true_positives"],
                "false_positives": data["false_positives"]
            }
            for date, data in sorted(daily_data.items())
        ]

        return trends

    def _get_chains_in_range(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """获取指定时间范围内的攻击链"""
        if not self.neo4j.driver:
            logger.warning("Neo4j driver not available, returning empty list")
            return []

        query = """
            MATCH (c:AttackChain)
            WHERE c.start_time >= datetime($start_date)
              AND c.start_time < datetime($end_date)
            RETURN c.chain_id,
                   c.start_time,
                   c.alert_count,
                   c.max_severity,
                   c.status,
                   c.mitre_technique_id,
                   c.mitre_technique_name
            ORDER BY c.start_time DESC
        """

        with self.neo4j.driver.session() as session:
            result = session.run(query, start_date=start_date.isoformat(), end_date=end_date.isoformat())
            return [dict(record) for record in result]

    def to_dict(self, metrics: DailyMetrics) -> Dict[str, Any]:
        """将 DailyMetrics 转换为字典"""
        return {
            "date": metrics.date,
            "total_alerts": metrics.total_alerts,
            "total_chains": metrics.total_chains,
            "true_positives": metrics.true_positives,
            "false_positives": metrics.false_positives,
            "fp_rate": metrics.fp_rate,
            "fp_rate_percent": round(metrics.fp_rate * 100, 1),
            "severity_distribution": metrics.severity_distribution,
            "top_attack_types": metrics.top_attack_types
        }
