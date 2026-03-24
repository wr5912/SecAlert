"""误报率指标模块

跟踪和分析误报过滤效果
"""

from typing import Dict, Any


class FalsePositiveMetrics:
    """误报率指标追踪器

    记录分类结果，用于分析误报率是否达到 <30% 目标
    """

    def __init__(self):
        self.total_chains = 0
        self.false_positives = 0
        self.true_positives = 0
        self.suppressed = 0

    def record(self, is_real_threat: bool, was_suppressed: bool = False) -> None:
        """记录一次分类结果

        Args:
            is_real_threat: 是否为真实攻击
            was_suppressed: 是否被抑制（误报）
        """
        self.total_chains += 1
        if is_real_threat:
            self.true_positives += 1
        else:
            self.false_positives += 1
        if was_suppressed:
            self.suppressed += 1

    def get_false_positive_rate(self) -> float:
        """获取误报率"""
        if self.total_chains == 0:
            return 0.0
        return self.false_positives / self.total_chains

    def get_metrics(self) -> Dict[str, Any]:
        """获取指标汇总"""
        return {
            "total_chains": self.total_chains,
            "true_positives": self.true_positives,
            "false_positives": self.false_positives,
            "suppressed": self.suppressed,
            "false_positive_rate": self.get_false_positive_rate()
        }
