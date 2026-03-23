#!/bin/bash
# Kafka topic creation for Phase 1
# Usage: ./create-topics.sh [bootstrap_server]
# Default bootstrap server: localhost:9092

KAFKA_BOOTSTRAP=${KAFKA_BOOTSTRAP:-localhost:9092}

echo "Creating Kafka topics with bootstrap server: $KAFKA_BOOTSTRAP"

# Create raw-suricata topic (partitioned by device type per user decision)
kafka-topics --create \
  --bootstrap-server $KAFKA_BOOTSTRAP \
  --topic raw-suricata \
  --partitions 6 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config max.message.bytes=1048576

# Create raw-firewall topic (placeholder for future devices)
kafka-topics --create \
  --bootstrap-server $KAFKA_BOOTSTRAP \
  --topic raw-firewall \
  --partitions 6 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "Topics created successfully"

# List created topics
kafka-topics --list --bootstrap-server $KAFKA_BOOTSTRAP
