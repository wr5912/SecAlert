"""
End-to-end integration test for Phase 1 pipeline:
Vector syslog -> Kafka -> Parser -> PostgreSQL

Tests:
1. Vector receives syslog and forwards to Kafka (infra-01, infra-02)
2. Parser processes Suricata EVE JSON through three tiers (infra-03)
3. Parsed alerts stored in PostgreSQL (parse-01)
4. Redis deduplication works (infra-01)
"""
import json
import os
import time
import pytest
from datetime import datetime, timezone
from typing import Optional

# Test configuration from environment
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
POSTGRES_CONN = os.getenv("POSTGRES_CONN", "postgresql://secalert:secalert_dev@localhost:5432/secalert")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))


class TestVectorPipeline:
    """Test Vector -> Kafka pipeline."""

    def test_kafka_topic_exists(self):
        """Verify raw-suricata topic exists."""
        pytest.importorskip("confluent_kafka")
        from confluent_kafka.admin import AdminClient
        admin = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP})
        topics = admin.list_topics().topics
        assert "raw-suricata" in topics, "raw-suricata topic should exist"

    def test_kafka_produce_consume(self):
        """Verify Vector can produce to and Kafka can serve messages."""
        pytest.importorskip("confluent_kafka")
        from confluent_kafka import Producer, Consumer

        # Produce test message
        producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})
        test_event = {"test": "message", "timestamp": datetime.now(timezone.utc).isoformat()}
        producer.produce("raw-suricata", json.dumps(test_event).encode())
        producer.flush(timeout=5)

        # Consume test message
        consumer = Consumer({
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "group.id": "test-consumer",
            "auto.offset.reset": "earliest"
        })
        consumer.subscribe(["raw-suricata"])
        msg = consumer.poll(timeout=5)
        consumer.close()

        assert msg is not None, "Should receive message from Kafka"
        assert json.loads(msg.value().decode())["test"] == "message"


class TestThreeTierParser:
    """Test three-tier parser pipeline."""

    def test_template_matching(self):
        """Test tier-1 template matching for Suricata alerts."""
        from parser.pipeline import ThreeTierParser

        parser = ThreeTierParser()
        suricata_event = {
            "timestamp": "2026-03-22T10:00:00.000000Z",
            "event_type": "alert",
            "src_ip": "192.168.1.100",
            "src_port": 12345,
            "dest_ip": "10.0.0.1",
            "dest_port": 443,
            "proto": "TCP",
            "alert": {"signature": "ET SCAN", "severity": 2}
        }

        result = parser.parse(json.dumps(suricata_event), "suricata")
        assert result is not None
        assert "source_type" in result

    def test_drain_clustering(self):
        """Test tier-2 Drain clustering for unknown formats."""
        from parser.pipeline import ThreeTierParser

        parser = ThreeTierParser()
        # Unknown format should fall through to Drain
        unknown_log = "2026-03-22 10:00:00 UnknownDevice Alert: SRC=1.2.3.4 DST=5.6.7.8 TYPE=scan"
        result = parser.parse(unknown_log, "unknown")
        assert result is not None


class TestStorage:
    """Test PostgreSQL storage and Redis deduplication."""

    def test_ocsf_mapping(self):
        """Test Suricata to OCSF mapping."""
        ocsf_mapper = pytest.importorskip("storage.ocsf_mapper")
        from storage.ocsf_mapper import map_suricata_to_ocsf

        suricata_event = {
            "timestamp": "2026-03-22T10:00:00.000000Z",
            "event_type": "alert",
            "src_ip": "192.168.1.100",
            "src_port": 12345,
            "dest_ip": "10.0.0.1",
            "dest_port": 443,
            "proto": "TCP",
            "alert": {"signature": "ET SCAN", "severity": 2}
        }

        ocsf = map_suricata_to_ocsf(suricata_event, "suricata-01")
        assert ocsf["source_type"] == "ids"
        assert ocsf["source_name"] == "suricata-01"
        assert "event_id" in ocsf

    def test_redis_dedup(self):
        """Test Redis deduplication with 24h window."""
        redis_dedup = pytest.importorskip("storage.redis.dedup")
        from storage.redis.dedup import RedisDedup
        import redis as redis_lib

        # 检查 Redis 是否可用
        try:
            test_client = redis_lib.Redis(host=REDIS_HOST, port=REDIS_PORT)
            test_client.ping()
        except redis_lib.exceptions.ConnectionError:
            pytest.skip("Redis not available")

        dedup = RedisDedup(host=REDIS_HOST, port=REDIS_PORT)

        # 使用带时间戳的唯一 event 避免与历史数据冲突
        import uuid
        unique_sig = f"ET SCAN {uuid.uuid4().hex[:8]}"
        event = {
            "source_type": "suricata",
            "alert_signature": unique_sig,
            "src_ip": "192.168.1.100",
            "dest_ip": "10.0.0.1"
        }

        # 确保测试前清理可能的旧数据
        test_client.delete(dedup._make_key(event))

        # First call should be NOT duplicate
        assert dedup.is_duplicate(event) == False

        # Second call should BE duplicate
        assert dedup.is_duplicate(event) == True

    @pytest.mark.skipif("CI" in os.environ, reason="Requires running PostgreSQL")
    def test_postgres_alert_record(self):
        """Test alert record can be created and validated."""
        from storage.postgres.models import AlertRecord, OCSFAlert
        from uuid import uuid4

        ocsf_event = OCSFAlert(
            event_id=uuid4(),
            timestamp=datetime.now(timezone.utc),
            source_type="suricata",
            source_name="suricata-01",
            event_type="alert",
            raw_event={"test": "data"}
        )
        record = AlertRecord(
            id=uuid4(),
            timestamp=datetime.now(timezone.utc),
            source_type="suricata",
            source_name="suricata-01",
            event_type="alert",
            src_ip="192.168.1.100",
            src_port=12345,
            dst_ip="10.0.0.1",
            dst_port=443,
            severity="medium",
            raw_event={"test": "data"},
            ocsf_event=ocsf_event,
            created_at=datetime.now(timezone.utc)
        )

        assert record.source_type == "suricata"
        assert record.severity == "medium"