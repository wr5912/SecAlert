"""误报率统计单元测试

测试 FalsePositiveMetricsCollector
重点覆盖：
1. 误报率计算
2. <30% 目标判断
3. 严重度分布统计
"""

import pytest
from unittest.mock import MagicMock, patch

from src.analysis.metrics import FalsePositiveMetricsCollector, FalsePositiveMetrics


class TestFalsePositiveMetrics:
    """误报率统计测试"""

    def test_fp_rate_calculation(self, mock_neo4j_chains):
        """测试：误报率计算"""
        collector = FalsePositiveMetricsCollector()

        # Mock Neo4j client
        mock_neo4j = MagicMock()
        mock_neo4j.list_chains.return_value = mock_neo4j_chains
        collector.neo4j = mock_neo4j

        result = collector.calculate_fp_rate(time_window_hours=24)

        assert isinstance(result, FalsePositiveMetrics)
        assert result.total_chains == 4
        assert result.false_positives == 2
        assert result.true_positives == 2
        assert result.fp_rate == 0.5  # 2/4 = 0.5
        assert result.fp_rate_percent == 50.0
        assert result.target_met is False  # 50% > 30%

    def test_fp_rate_target_met(self, mock_neo4j_chains):
        """测试：误报率 < 30% 目标达成"""
        collector = FalsePositiveMetricsCollector()

        # 构造低误报率数据：1 false_positive / 10 total = 10%
        low_fp_chains = mock_neo4j_chains.copy()
        for i in range(6):
            low_fp_chains.append({
                "chain_id": f"chain-active-{i}",
                "status": "active",
                "max_severity": 70,
                "alert_count": 3
            })

        mock_neo4j = MagicMock()
        mock_neo4j.list_chains.return_value = low_fp_chains
        collector.neo4j = mock_neo4j

        result = collector.calculate_fp_rate(time_window_hours=24)

        assert result.total_chains == 10
        assert result.false_positives == 2
        assert result.fp_rate == 0.2  # 2/10 = 0.2
        assert result.target_met is True  # 20% < 30%

    def test_fp_rate_zero_chains(self):
        """测试：零链时返回零误报率"""
        collector = FalsePositiveMetricsCollector()

        mock_neo4j = MagicMock()
        mock_neo4j.list_chains.return_value = []
        collector.neo4j = mock_neo4j

        result = collector.calculate_fp_rate(time_window_hours=24)

        assert result.total_chains == 0
        assert result.false_positives == 0
        assert result.fp_rate == 0.0
        assert result.target_met is True

    def test_severity_distribution(self, mock_neo4j_chains):
        """测试：严重度分布统计"""
        collector = FalsePositiveMetricsCollector()

        mock_neo4j = MagicMock()
        mock_neo4j.list_chains.return_value = mock_neo4j_chains
        collector.neo4j = mock_neo4j

        result = collector.get_severity_distribution(status="active")

        assert isinstance(result, dict)
        assert "critical" in result
        assert "high" in result
        assert "medium" in result
        assert "low" in result

    def test_metrics_to_dict(self, mock_neo4j_chains):
        """测试：指标对象转字典"""
        collector = FalsePositiveMetricsCollector()

        mock_neo4j = MagicMock()
        mock_neo4j.list_chains.return_value = mock_neo4j_chains
        collector.neo4j = mock_neo4j

        metrics = collector.calculate_fp_rate(time_window_hours=24)
        result = collector.to_dict(metrics)

        assert isinstance(result, dict)
        assert "fp_rate" in result
        assert "fp_rate_percent" in result
        assert "total_chains" in result
        assert "target_met" in result
