"""
采集 Metrics Collector

收集、聚合和提供采集系统的各类指标。
支持 EPS 计算、延迟跟踪和健康状态监控。

用法:
    collector = MetricsCollector()
    collector.start()

    # 在消息处理时调用
    collector.record_event_in()
    collector.record_event_out()
    collector.record_parse_error()

    # 获取指标
    metrics = collector.get_metrics()
"""

import logging
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Optional

from src.collection.metrics.models import (
    CollectionMetrics,
    DatasourceHealth,
    MetricsSummary,
    format_prometheus_output,
)

logger = logging.getLogger(__name__)


class SlidingWindowRateCalculator:
    """滑动窗口速率计算器"""

    def __init__(self, window_size_seconds: int = 60):
        self.window_size = window_size_seconds
        self.timestamps = deque(maxlen=10000)  # 最多保留 10000 个时间戳
        self.lock = threading.Lock()

    def add(self):
        """记录一次事件"""
        with self.lock:
            self.timestamps.append(time.time())

    def get_rate(self) -> float:
        """获取速率 (events/second)"""
        with self.lock:
            if not self.timestamps:
                return 0.0

            now = time.time()
            # 清理过期的时间戳
            while self.timestamps and self.timestamps[0] < now - self.window_size:
                self.timestamps.popleft()

            if not self.timestamps:
                return 0.0

            # 计算窗口内的事件数
            count = len(self.timestamps)
            # 计算实际时间窗口
            time_span = now - self.timestamps[0] if self.timestamps else 0

            if time_span > 0:
                return count / time_span
            return 0.0


class MetricsCollector:
    """采集指标收集器"""

    def __init__(self):
        self._lock = threading.Lock()
        self._running = False
        self._start_time = time.time()

        # 计数指标
        self._events_in_total = 0
        self._events_out_total = 0
        self._parse_errors_total = 0
        self._dlq_messages_total = 0

        # 滑动窗口速率计算器
        self._rate_calculator_in = SlidingWindowRateCalculator(60)
        self._rate_calculator_out = SlidingWindowRateCalculator(60)

        # 延迟跟踪
        self._last_event_timestamp: Optional[float] = None
        self._collection_lag_ms = 0

        # DLQ 大小 (从 Redis 查询)
        self._dlq_size = 0

        # 数据源健康状态
        self._datasources: Dict[str, DatasourceHealth] = {}

        # 健康检查线程
        self._health_check_thread: Optional[threading.Thread] = None

    def start(self):
        """启动指标收集器"""
        self._running = True
        self._health_check_thread = threading.Thread(target=self._health_check_loop)
        self._health_check_thread.daemon = True
        self._health_check_thread.start()
        logger.info("MetricsCollector 已启动")

    def stop(self):
        """停止指标收集器"""
        self._running = False
        if self._health_check_thread:
            self._health_check_thread.join(timeout=5)
        logger.info("MetricsCollector 已停止")

    def record_event_in(self, datasource: str = "unknown"):
        """记录输入事件"""
        with self._lock:
            self._events_in_total += 1
            self._rate_calculator_in.add()
            self._last_event_timestamp = time.time()

        # 更新数据源统计
        self._update_datasource(datasource, events_delta=1)

    def record_event_out(self):
        """记录输出事件"""
        with self._lock:
            self._events_out_total += 1
            self._rate_calculator_out.add()

    def record_parse_error(self, datasource: str = "unknown"):
        """记录解析错误"""
        with self._lock:
            self._parse_errors_total += 1

        # 更新数据源错误统计
        self._update_datasource(datasource, errors_delta=1)

    def record_dlq_message(self):
        """记录 DLQ 消息"""
        with self._lock:
            self._dlq_messages_total += 1

    def update_collection_lag(self, lag_ms: int):
        """更新采集延迟"""
        with self._lock:
            self._collection_lag_ms = lag_ms

    def update_dlq_size(self, size: int):
        """更新 DLQ 大小"""
        with self._lock:
            self._dlq_size = size

    def _update_datasource(self, name: str, events_delta: int = 0, errors_delta: int = 0):
        """更新数据源统计"""
        if name not in self._datasources:
            self._datasources[name] = DatasourceHealth(
                name=name,
                type=self._guess_datasource_type(name),
                status="healthy",
                last_seen=datetime.now(timezone.utc),
                events_total=0,
                errors_total=0,
                health_score=1.0
            )

        ds = self._datasources[name]
        ds.events_total += events_delta
        ds.errors_total += errors_delta
        ds.last_seen = datetime.now(timezone.utc)

        # 计算健康分数
        if ds.events_total > 0:
            error_rate = ds.errors_total / ds.events_total
            ds.health_score = max(0.0, 1.0 - error_rate)
            ds.status = "healthy" if ds.health_score > 0.9 else "degraded"
        else:
            ds.health_score = 1.0
            ds.status = "healthy"

    def _guess_datasource_type(self, name: str) -> str:
        """猜测数据源类型"""
        name_lower = name.lower()
        if "syslog" in name_lower:
            return "syslog"
        elif "http" in name_lower or "rest" in name_lower or "polling" in name_lower:
            return "http_polling"
        elif "jdbc" in name_lower or "database" in name_lower or "sql" in name_lower:
            return "jdbc"
        elif "file" in name_lower or "tail" in name_lower:
            return "file"
        elif "elasticsearch" in name_lower or "es" in name_lower:
            return "elasticsearch"
        else:
            return "unknown"

    def _health_check_loop(self):
        """健康检查循环"""
        while self._running:
            try:
                self._check_datasources_health()
                self._update_dlq_size_from_redis()
            except Exception as e:
                logger.warning(f"健康检查异常: {e}")

            time.sleep(10)  # 每 10 秒检查一次

    def _check_datasources_health(self):
        """检查数据源健康状态"""
        now = time.time()
        with self._lock:
            for ds in self._datasources.values():
                if ds.last_seen:
                    last_seen_ts = ds.last_seen.timestamp()
                    # 如果超过 5 分钟没有数据，标记为 down
                    if now - last_seen_ts > 300:
                        ds.status = "down"
                        ds.health_score = 0.0

    def _update_dlq_size_from_redis(self):
        """从 Redis 更新 DLQ 大小"""
        try:
            import os
            import redis

            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            redis_url = redis_url.replace("redis://", "")
            host_port = redis_url.split(":")
            host = host_port[0]
            port = int(host_port[1]) if len(host_port) > 1 else 6379

            client = redis.Redis(host=host, port=port, decode_responses=True)
            # 获取 DLQ 重试队列大小
            dlq_size = client.zcard("dlq:retry_queue")
            self.update_dlq_size(dlq_size)
            client.close()
        except Exception as e:
            logger.debug(f"无法从 Redis 获取 DLQ 大小: {e}")

    def get_metrics(self) -> CollectionMetrics:
        """获取当前指标"""
        with self._lock:
            # 计算解析成功率
            total_events = self._events_in_total
            parse_success = total_events - self._parse_errors_total
            parse_success_rate = parse_success / total_events if total_events > 0 else 1.0

            return CollectionMetrics(
                events_in_total=self._events_in_total,
                events_out_total=self._events_out_total,
                parse_errors_total=self._parse_errors_total,
                dlq_messages_total=self._dlq_messages_total,
                events_in_rate=self._rate_calculator_in.get_rate(),
                events_out_rate=self._rate_calculator_out.get_rate(),
                collection_lag_ms=self._collection_lag_ms,
                last_event_timestamp=self._last_event_timestamp,
                dlq_size=self._dlq_size,
                datasource_health=self._calculate_overall_health(),
                parse_success_rate=parse_success_rate,
                last_updated=datetime.now(timezone.utc)
            )

    def get_summary(self) -> MetricsSummary:
        """获取指标摘要"""
        return MetricsSummary(
            timestamp=datetime.now(timezone.utc),
            collection=self.get_metrics(),
            datasources=list(self._datasources.values()),
            uptime_seconds=time.time() - self._start_time
        )

    def _calculate_overall_health(self) -> float:
        """计算整体健康状态"""
        if not self._datasources:
            return 1.0

        total_score = sum(ds.health_score for ds in self._datasources.values())
        return total_score / len(self._datasources)

    def get_prometheus_format(self) -> str:
        """获取 Prometheus 格式的指标"""
        return format_prometheus_output(self.get_metrics())


# 全局单例
_global_collector: Optional[MetricsCollector] = None
_collector_lock = threading.Lock()


def get_metrics_collector() -> MetricsCollector:
    """获取全局 MetricsCollector 单例"""
    global _global_collector
    with _collector_lock:
        if _global_collector is None:
            _global_collector = MetricsCollector()
            _global_collector.start()
        return _global_collector
