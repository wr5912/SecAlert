"""
采集可观测性指标模型

定义采集系统各指标的 JSON Schema/Pydantic 模型。
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class CollectionMetrics(BaseModel):
    """采集指标集合"""

    # 计数指标
    events_in_total: int = Field(default=0, description="总输入事件数")
    events_out_total: int = Field(default=0, description="总输出事件数")
    parse_errors_total: int = Field(default=0, description="解析错误总数")
    dlq_messages_total: int = Field(default=0, description="DLQ 消息总数")

    # 速率指标 (计算得出)
    events_in_rate: float = Field(default=0.0, description="EPS (每秒输入事件数)")
    events_out_rate: float = Field(default=0.0, description="EPS (每秒输出事件数)")

    # 延迟指标
    collection_lag_ms: int = Field(default=0, description="采集延迟 (毫秒)")
    last_event_timestamp: Optional[float] = Field(default=None, description="最新事件时间戳")

    # 健康指标
    dlq_size: int = Field(default=0, description="当前 DLQ 大小")
    datasource_health: float = Field(default=1.0, ge=0, le=1, description="数据源健康状态 (0-1)")
    parse_success_rate: float = Field(default=1.0, ge=0, le=1, description="解析成功率 (0-1)")

    # 时间戳
    last_updated: Optional[datetime] = Field(default=None, description="最后更新时间")


class DatasourceHealth(BaseModel):
    """数据源健康状态"""

    name: str = Field(description="数据源名称")
    type: str = Field(description="数据源类型: syslog, http_polling, jdbc, file, es")
    status: str = Field(description="状态: healthy, degraded, down")
    last_seen: Optional[datetime] = Field(default=None, description="最后收到数据时间")
    events_total: int = Field(default=0, description="该数据源收到的事件总数")
    errors_total: int = Field(default=0, description="该数据源的错误总数")
    health_score: float = Field(default=1.0, ge=0, le=1, description="健康分数")


class MetricsSummary(BaseModel):
    """指标摘要"""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    collection: CollectionMetrics
    datasources: List[DatasourceHealth] = Field(default_factory=list)
    uptime_seconds: float = Field(default=0, description="采集服务运行时间")


class PrometheusMetric(BaseModel):
    """Prometheus 格式指标"""

    name: str
    help: str
    type: str  # counter, gauge, histogram, summary
    value: float
    labels: Dict[str, str] = Field(default_factory=dict)


def metrics_to_prometheus(metrics: CollectionMetrics) -> List[PrometheusMetric]:
    """将采集指标转换为 Prometheus 格式"""
    prom_metrics = []

    # Counters
    prom_metrics.append(PrometheusMetric(
        name="secalert_events_in_total",
        help="Total number of events received",
        type="counter",
        value=float(metrics.events_in_total)
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_events_out_total",
        help="Total number of events processed",
        type="counter",
        value=float(metrics.events_out_total)
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_parse_errors_total",
        help="Total number of parse errors",
        type="counter",
        value=float(metrics.parse_errors_total)
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_dlq_messages_total",
        help="Total number of DLQ messages",
        type="counter",
        value=float(metrics.dlq_messages_total)
    ))

    # Gauges
    prom_metrics.append(PrometheusMetric(
        name="secalert_events_in_rate",
        help="Events received per second",
        type="gauge",
        value=metrics.events_in_rate
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_events_out_rate",
        help="Events processed per second",
        type="gauge",
        value=metrics.events_out_rate
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_collection_lag_ms",
        help="Collection lag in milliseconds",
        type="gauge",
        value=float(metrics.collection_lag_ms)
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_dlq_size",
        help="Current size of dead letter queue",
        type="gauge",
        value=float(metrics.dlq_size)
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_datasource_health",
        help="Data source health status (0-1)",
        type="gauge",
        value=metrics.datasource_health
    ))

    prom_metrics.append(PrometheusMetric(
        name="secalert_parse_success_rate",
        help="Parse success rate (0-1)",
        type="gauge",
        value=metrics.parse_success_rate
    ))

    return prom_metrics


def format_prometheus_output(metrics: CollectionMetrics) -> str:
    """格式化为 Prometheus text format"""
    lines = []
    prom_metrics = metrics_to_prometheus(metrics)

    for m in prom_metrics:
        labels = ""
        if m.labels:
            label_str = ",".join([f'{k}="{v}"' for k, v in m.labels.items()])
            labels = f"{{{label_str}}}"

        lines.append(f"# HELP {m.name} {m.help}")
        lines.append(f"# TYPE {m.name} {m.type}")
        lines.append(f"{m.name}{labels} {m.value}")

    return "\n".join(lines) + "\n"
