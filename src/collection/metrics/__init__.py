"""
采集可观测性指标模块

提供采集系统的各类指标收集、聚合和暴露功能。

主要组件:
- models: 指标数据模型
- collector: MetricsCollector 收集器
"""

from src.collection.metrics.models import (
    CollectionMetrics,
    DatasourceHealth,
    MetricsSummary,
    PrometheusMetric,
    format_prometheus_output,
    metrics_to_prometheus,
)
from src.collection.metrics.collector import (
    MetricsCollector,
    get_metrics_collector,
    SlidingWindowRateCalculator,
)

__all__ = [
    "CollectionMetrics",
    "DatasourceHealth",
    "MetricsSummary",
    "PrometheusMetric",
    "format_prometheus_output",
    "metrics_to_prometheus",
    "MetricsCollector",
    "get_metrics_collector",
    "SlidingWindowRateCalculator",
]
