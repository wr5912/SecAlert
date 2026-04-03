#!/bin/bash
#
# v1.6 环境验证脚本
#
# 用法:
#   ./scripts/verify-setup.sh
#

set -e

echo "=========================================="
echo "SecAlert v1.6 环境验证"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}

    echo -n "检查 $name... "
    if curl -sf --max-time "$timeout" "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}失败${NC}"
        return 1
    fi
}

check_container() {
    local name=$1
    echo -n "检查容器 $name... "
    if docker ps --filter "name=$name" --format "{{.Status}}" | grep -q "Up"; then
        echo -e "${GREEN}运行中${NC}"
        return 0
    else
        echo -e "${YELLOW}未运行${NC}"
        return 1
    fi
}

check_kafka_topic() {
    local topic=$1
    echo -n "检查 Kafka topic '$topic'... "
    if docker exec secalert-kafka kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null | grep -q "^$topic$"; then
        echo -e "${GREEN}存在${NC}"
        return 0
    else
        echo -e "${YELLOW}不存在${NC}"
        return 1
    fi
}

# 主流程
echo "=== 1. 容器状态检查 ==="
check_container "secalert-zookeeper"
check_container "secalert-kafka"
check_container "secalert-elasticsearch"
check_container "secalert-redis"
check_container "secalert-postgres"
check_container "secalert-neo4j"
check_container "secalert-api"
check_container "secalert-vector"
check_container "secalert-prometheus" || true  # 可选服务
echo ""

echo "=== 2. HTTP 服务检查 ==="
check_service "API 服务" "http://localhost:8000/health"
check_service "Neo4j" "http://localhost:7474"
check_service "Elasticsearch" "http://localhost:9200"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Vector API" "http://localhost:9001/health"
check_service "Vector Prometheus" "http://localhost:9002/metrics" || true
echo ""

echo "=== 3. Kafka Topics 检查 ==="
check_kafka_topic "raw-suricata"
check_kafka_topic "dlq-events"
check_kafka_topic "parsed-events"
echo ""

echo "=== 4. API 端点检查 ==="
echo "- Metrics Summary:"
curl -sf http://localhost:8000/api/metrics/collection/summary 2>/dev/null | head -c 200 || echo "失败"
echo ""

echo "- Metrics Prometheus:"
curl -sf http://localhost:8000/api/metrics/collection/prometheus 2>/dev/null | head -c 200 || echo "失败"
echo ""

echo "- Prometheus Targets:"
curl -sf http://localhost:9090/api/v1/targets 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('Status:', d.get('status'))" || echo "失败"
echo ""

echo "=== 5. 模拟器检查 ==="
check_container "syslog-simulator" || true
check_container "rest-polling-simulator" || true
check_container "file-simulator" || true
echo ""

echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
echo "快速命令:"
echo "  查看日志:     docker-compose logs -f [service]"
echo "  查看指标:     curl http://localhost:8000/api/v1/metrics/collection/summary"
echo "  Prometheus:  http://localhost:9090"
echo "  运行测试:    pytest tests/integration/test_collectors.py -v"
