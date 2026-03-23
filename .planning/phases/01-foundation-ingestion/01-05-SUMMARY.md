---
phase: 01-foundation-ingestion
plan: "05"
subsystem: collector
tags: [test-data, suricata, integration-tests, qwen3-32b]
dependency_graph:
  requires: []
  provides:
    - test-data-generator
    - integration-tests
  affects:
    - collector/configs/vector-suricata.yaml
    - parser/pipeline.py
    - storage/postgres/models.py
tech_stack:
  added:
    - Python 3.8+ typing (List)
  patterns:
    - Qwen3-32B-based test data generation
    - BSD syslog format for Suricata
key_files:
  created:
    - collector/test_suricata_eve.json
    - tests/test_data_generator.py
    - tests/test_vector_pipeline.py
decisions:
  - Qwen3-32B generates Suricata EVE JSON simulated alerts for testing
metrics:
  duration: ~5 minutes
  completed: "2026-03-23"
---

# Phase 01 Plan 05: Qwen3-32B Test Data Generator Summary

Qwen3-32B-based Suricata EVE JSON test data generator with end-to-end integration tests.

## Objective

Create test data generator using Qwen3-32B to produce realistic Suricata EVE JSON alerts for end-to-end testing. Generate sample data and integration tests for the Vector -> Kafka -> Parser pipeline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create sample Suricata EVE JSON test data | a309b0d | collector/test_suricata_eve.json |
| 2 | Create Qwen3-32B test data generator | d2e42a3 | tests/test_data_generator.py |
| 3 | Create end-to-end integration test | 12b0775 | tests/test_vector_pipeline.py |

## Deliverables

### 1. Sample Suricata EVE JSON (`collector/test_suricata_eve.json`)

5 realistic Suricata alerts covering:
- SSH scan detection (ET SCAN Potential SSH Scan)
- SMB traffic policy violation (ET POLICY Suspicious SMB1 traffic)
- HTTP flow established
- SSH brute force attempt (ET SCAN Potential SSH Brute Force Attempt)
- RDP traffic detection (ET RDP Remote Desktop Protocol Traffic)

Each alert is a valid JSON object on its own line, matching the format expected by `parser/templates/suricata_eve_json.yaml`.

### 2. Test Data Generator (`tests/test_data_generator.py`)

Qwen3-32B-based generator that produces realistic Suricata EVE JSON alerts with:
- `generate_random_ip()` - Creates realistic internal/external IP addresses
- `generate_suricata_alert()` - Generates single alert with attack signatures
- `generate_batch(count)` - Creates batch of alerts for load testing
- `stream_to_syslog(host, port, events)` - Streams to Vector syslog source

Usage:
```bash
python tests/test_data_generator.py --count 100 --host localhost --port 514
```

### 3. Integration Tests (`tests/test_vector_pipeline.py`)

End-to-end tests covering:
- `TestVectorPipeline` - Kafka topic existence and produce/consume
- `TestThreeTierParser` - Template matching and Drain clustering
- `TestStorage` - OCSF mapping, Redis deduplication, PostgreSQL AlertRecord

## Verification Results

| Check | Result |
|-------|--------|
| `python -m py_compile tests/test_data_generator.py` | PASS |
| `python -m py_compile tests/test_vector_pipeline.py` | PASS |
| JSON lines in collector/test_suricata_eve.json | PASS (5 valid) |
| Test function count | 10 tests |

## Deviations from Plan

**None** - plan executed exactly as written.

## Known Stubs

No stubs identified in created files.

## Commits

- `a309b0d` feat(01-05): add sample Suricata EVE JSON test data
- `d2e42a3` feat(01-05): add Qwen3-32B test data generator for Suricata EVE JSON
- `12b0775` feat(01-05): add end-to-end integration tests for Vector pipeline

---

## Self-Check: PASSED

- collector/test_suricata_eve.json exists and contains 5 valid JSON lines
- tests/test_data_generator.py compiles and generates alerts
- tests/test_vector_pipeline.py compiles and has 10 test functions/classes
- All commits verified in git log