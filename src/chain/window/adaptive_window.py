"""
动态时间窗口算法

根据告警频率自适应调整窗口大小:
- 短时大量同类告警 (如暴力破解) → 缩短窗口 (5min)
- 零星告警 (如后门) → 延长窗口 (24h)
- 正常情况 → 固定备选窗口 (1h)
"""

from dataclasses import dataclass, field
from collections import deque
from typing import Deque
import time


@dataclass
class AdaptiveWindow:
    """
    按告警频率自适应的动态时间窗口

    属性:
        base_window_seconds: 固定备选窗口 (默认 1小时)
        min_window_seconds: 最短窗口 (默认 5分钟, 暴力破解场景)
        max_window_seconds: 最长窗口 (默认 24小时, 后门场景)
        burst_threshold: 短时大量告警阈值 (默认 10条/5min)
        burst_window_seconds: 短时窗口统计周期 (默认 5分钟)
    """
    base_window_seconds: int = 3600
    min_window_seconds: int = 300
    max_window_seconds: int = 86400
    burst_threshold: int = 10
    burst_window_seconds: int = 300

    # 内部状态
    _alert_history: Deque[float] = field(default_factory=lambda: deque(maxlen=1000), repr=False)

    def compute_window(self, now: float = None) -> int:
        """
        根据当前告警频率计算窗口大小

        Args:
            now: 当前时间戳 (默认 time.time())

        Returns:
            窗口大小 (秒)
        """
        now = now or time.time()
        window_start = now - self.base_window_seconds

        # 清理历史，只保留 base_window 秒内的
        while self._alert_history and self._alert_history[0] < window_start:
            self._alert_history.popleft()

        # 统计 base_window 内的告警数量
        recent_count = len(self._alert_history)

        # 统计 burst_window 内的告警数量 (短时高频检测)
        burst_start = now - self.burst_window_seconds
        burst_count = sum(1 for t in self._alert_history if t >= burst_start)

        if burst_count >= self.burst_threshold:
            # 短时大量同类告警 (如暴力破解)，缩短窗口
            return self.min_window_seconds
        elif recent_count <= 2:
            # 零星告警 (如后门)，延长窗口
            return self.max_window_seconds
        else:
            # 正常情况，线性插值
            ratio = recent_count / 100  # 假设 100 条/窗口为中等密度
            window = int(self.base_window_seconds * (1.0 - ratio * 0.5))
            return max(self.min_window_seconds, min(self.max_window_seconds, window))

    def record_alert(self, timestamp: float = None) -> None:
        """
        记录一次告警到达

        Args:
            timestamp: 告警时间戳 (默认当前时间)
        """
        self._alert_history.append(timestamp or time.time())

    def reset(self) -> None:
        """重置窗口状态"""
        self._alert_history.clear()

    def get_stats(self) -> dict:
        """获取当前窗口统计信息"""
        now = time.time()
        burst_start = now - self.burst_window_seconds
        burst_count = sum(1 for t in self._alert_history if t >= burst_start)

        return {
            "total_alerts": len(self._alert_history),
            "burst_alerts": burst_count,
            "current_window_seconds": self.compute_window()
        }
