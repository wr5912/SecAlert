---
phase: 01-foundation-ingestion
plan: "02"
subsystem: infra
tags: [vector, kafka, syslog, suricata]

# Dependency graph
requires:
  - phase: 01-01
    provides: Docker Compose environment with Kafka broker
provides:
  - Vector syslog source configuration for Suricata TCP/514
  - Vector Kafka sink with reliable delivery (acks: all)
  - Kafka topic creation script for raw-suricata and raw-firewall
affects: [01-03-parser, 01-04-storage]

# Tech tracking
tech-stack:
  added: []
  patterns: [vector-syslog-to-kafka-pipeline]

key-files:
  created:
    - collector/configs/vector-suricata.yaml
    - collector/configs/vector-kafka-sink.yaml
    - kafka/create-topics.sh

key-decisions:
  - "Suricata BSD syslog requires TCP mode with line framing (mode: tcp, framing.method: lines)"
  - "Kafka sink uses acks: all for zero data loss"
  - "Device-type partitioning via separate topics (raw-suricata, raw-firewall)"

patterns-established:
  - "Vector syslog source -> Kafka sink pipeline pattern"
  - "BSD syslog TCP line-framing configuration"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 01 Plan 02: Vector Syslog to Kafka Pipeline Summary

**Vector agent configured to receive Suricata BSD syslog via TCP on port 514 and reliably deliver events to Kafka topic raw-suricata with acks: all**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T00:36:28Z
- **Completed:** 2026-03-23T00:40:09Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Vector TCP syslog source on port 514 with BSD line framing for Suricata
- Vector Kafka sink with gzip compression, acks: all, and 1GB disk buffer
- Kafka topic creation script for raw-suricata (6 partitions) and raw-firewall

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Vector syslog source configuration** - `16cb234` (feat)
2. **Task 2: Create Vector Kafka sink configuration** - `333fb4a` (feat)
3. **Task 3: Create Kafka topic creation script** - `6979061` (feat)

## Files Created/Modified

- `collector/configs/vector-suricata.yaml` - TCP syslog source for Suricata BSD format with line framing
- `collector/configs/vector-kafka-sink.yaml` - Kafka sink with reliable delivery settings
- `kafka/create-topics.sh` - Executable script to create raw-suricata and raw-firewall topics

## Decisions Made

- Used TCP mode with line framing for Suricata BSD syslog (newline-delimited, not RFC5424 octet-counting)
- Set acks: all on Kafka sink to ensure zero data loss
- Partitioned by device type (raw-suricata, raw-firewall) per project architecture decision
- Configured 1GB disk buffer with block behavior for backpressure handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Vector configs ready at collector/configs/ mounted to Vector container
- Kafka bootstrap_servers: kafka:29092 configured in sink
- Topics can be created via docker-compose exec kafka kafka-topics
- Ready for Phase 01-03 (three-tier parser) to consume from Kafka

---
*Phase: 01-foundation-ingestion*
*Completed: 2026-03-23*
