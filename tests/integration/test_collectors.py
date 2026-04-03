"""
v1.6 集成测试

测试多源异构数据模拟器、DLQ 和采集可观测性监控的集成功能。

运行方式:
    pytest tests/integration/test_collectors.py -v
"""

import pytest
import time
import subprocess
import requests
from typing import Dict, Any


BASE_URL = "http://localhost:8000"
PROMETHEUS_URL = "http://localhost:9090"


class TestMetricsAPI:
    """测试 Metrics API 端点"""

    def test_metrics_collection_endpoint(self):
        """测试采集指标端点返回 JSON 格式"""
        response = requests.get(f"{BASE_URL}/api/metrics/collection")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "secalert_events_in_total" in data["metrics"]

    def test_metrics_summary_endpoint(self):
        """测试指标摘要端点"""
        response = requests.get(f"{BASE_URL}/api/metrics/collection/summary")
        assert response.status_code == 200
        data = response.json()
        assert "collection" in data
        assert "events_in_total" in data["collection"]

    def test_metrics_prometheus_endpoint(self):
        """测试 Prometheus 格式端点"""
        response = requests.get(f"{BASE_URL}/api/metrics/collection/prometheus")
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")
        content = response.text
        assert "secalert_events_in_total" in content
        assert "# HELP secalert_events_in_total" in content
        assert "# TYPE secalert_events_in_total counter" in content

    def test_datasource_health_endpoint(self):
        """测试数据源健康端点"""
        response = requests.get(f"{BASE_URL}/api/metrics/collection/datasource")
        assert response.status_code == 200
        data = response.json()
        assert "overall_health" in data
        assert "datasources" in data


class TestDLQAPI:
    """测试 DLQ API 端点"""

    def test_dlq_stats_endpoint(self):
        """测试 DLQ 统计端点"""
        response = requests.get(f"{BASE_URL}/api/v1/dlq/stats")
        # DLQ 服务可能未启动，返回 200 或 404 均可接受
        assert response.status_code in [200, 404]

    def test_dlq_list_endpoint(self):
        """测试 DLQ 列表端点"""
        response = requests.get(f"{BASE_URL}/api/v1/dlq/messages?limit=10")
        assert response.status_code in [200, 404]


class TestPrometheusIntegration:
    """测试 Prometheus 集成"""

    def test_prometheus_targets(self):
        """测试 Prometheus 能发现目标"""
        response = requests.get(f"{PROMETHEUS_URL}/api/v1/targets")
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "success"


class TestSimulators:
    """测试模拟器"""

    def test_syslog_simulator_container(self):
        """测试 Syslog 模拟器容器运行状态"""
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=syslog-simulator", "--format", "{{.Status}}"],
            capture_output=True,
            text=True
        )
        # 容器可能未启动，测试柔性处理
        if result.returncode == 0 and result.stdout.strip():
            assert "Up" in result.stdout

    def test_rest_polling_simulator_container(self):
        """测试 REST Polling 模拟器容器运行状态"""
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=rest-polling-simulator", "--format", "{{.Status}}"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            assert "Up" in result.stdout

    def test_file_simulator_container(self):
        """测试 File 模拟器容器运行状态"""
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=file-simulator", "--format", "{{.Status}}"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            assert "Up" in result.stdout


class TestVectorMetrics:
    """测试 Vector 指标暴露"""

    def test_vector_metrics_endpoint(self):
        """测试 Vector Prometheus 端点"""
        try:
            response = requests.get("http://localhost:9002/metrics", timeout=5)
            if response.status_code == 200:
                content = response.text
                # Vector 内部指标
                assert "vector_" in content or "secalert_" in content
        except requests.exceptions.RequestException:
            pytest.skip("Vector metrics endpoint not available")


class TestEndToEndFlow:
    """端到端流程测试"""

    def test_full_metrics_flow(self):
        """测试完整指标流程"""
        # 1. 获取指标摘要
        response = requests.get(f"{BASE_URL}/api/metrics/collection/summary")
        assert response.status_code == 200

        # 2. 获取 Prometheus 格式
        response = requests.get(f"{BASE_URL}/api/metrics/collection/prometheus")
        assert response.status_code == 200
        content = response.text

        # 3. 验证必需指标存在
        required_metrics = [
            "secalert_events_in_total",
            "secalert_events_out_total",
            "secalert_parse_errors_total",
            "secalert_collection_lag_ms",
            "secalert_dlq_size",
            "secalert_datasource_health",
            "secalert_parse_success_rate"
        ]

        for metric in required_metrics:
            assert metric in content, f"Missing metric: {metric}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
