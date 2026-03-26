---
phase: 01-foundation-ingestion
plan: "04"
subsystem: storage
tags: [postgresql, redis, ocsf, pydantic]

# Dependency graph
requires:
  - phase: "01"
    provides: "Foundation infrastructure (Docker Compose, Kafka topics)"
provides:
  - "PostgreSQL schema with UUID PK, JSONB fields, optimized indexes"
  - "Pydantic AlertRecord and OCSFAlert models with validation"
  - "Redis sliding window deduplication (24h SET NX EX)"
  - "Suricata EVE JSON to OCSF format mapping"
affects: [parser/pipeline.py, storage layer, Phase 2 analysis engine]

# Tech tracking
tech-stack:
  added: [pydantic, redis]
  patterns: [OCSF event normalization, Redis SET NX EX dedup, PostgreSQL JSONB storage]

key-files:
  created:
    - storage/postgres/init.sql
    - storage/postgres/models.py
    - storage/redis/dedup.py
    - storage/ocsf_mapper.py
  modified: []

key-decisions:
  - "UUID primary key for alerts table (not sequential) - better distribution for distributed systems"
  - "JSONB for raw_event and ocsf_event - flexible schema for heterogeneous security devices"
  - "GIN indexes on JSONB fields - enables efficient flexible field queries"
  - "24h Redis dedup window using SET NX EX - atomic operation with automatic expiry"

patterns-established:
  - "OCSF event format as standard output for all parsed events"
  - "Pydantic models for type safety at storage layer"
  - "Redis dedup key pattern: dedup:{md5(source_type:alert_sig:src_ip:dest_ip)}"

requirements-completed: [PARSE-01]

# Metrics
duration: 2min
completed: 2026-03-23T00:41:07Z
---

# Phase 1 Plan 4: PostgreSQL Storage + Redis Deduplication + OCSF Mapping Summary

**PostgreSQL alerts table with UUID PK, JSONB storage, Redis 24h deduplication, and Suricata-to-OCSF mapper implemented**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T00:38:48Z
- **Completed:** 2026-03-23T00:41:07Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- PostgreSQL schema with UUID primary key and JSONB columns for raw/OCSF events
- Pydantic AlertRecord and OCSFAlert models with IP validation
- Redis sliding window deduplication using SET NX EX with 24h TTL
- Suricata EVE JSON to OCSF format mapping with severity translation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PostgreSQL initialization SQL** - `2e03081` (feat)
2. **Task 2: Create Pydantic models for alerts** - `b2a7b2f` (feat)
3. **Task 3: Implement Redis sliding window deduplication** - `95b2797` (feat)
4. **Task 4: Implement Suricata to OCSF mapping** - `1010781` (feat)

## Files Created/Modified

- `storage/postgres/init.sql` - PostgreSQL alerts table schema with UUID PK, JSONB raw_event/ocsf_event, B-tree and GIN indexes
- `storage/postgres/models.py` - Pydantic AlertRecord, OCSFAlert, NetworkInfo, SecurityInfo models
- `storage/redis/dedup.py` - RedisDedup class with SET NX EX 24h sliding window
- `storage/ocsf_mapper.py` - map_suricata_to_ocsf() function and SURICATA_SEVERITY_MAP

## Decisions Made

- UUID primary key instead of sequential - better for distributed systems
- JSONB for raw and OCSF events - flexible schema for heterogeneous security devices
- GIN indexes on JSONB fields - enables efficient arbitrary field queries
- Redis SET NX EX for dedup - atomic operation with built-in 24h expiry
- OCSF format as standard output - ensures consistency across all parser outputs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Storage layer complete for Phase 1 (01-04 done)
- Parser pipeline can now store normalized OCSF events
- Ready for Phase 2: AI-powered false positive filtering

---
*Phase: 01-foundation-ingestion*
*Completed: 2026-03-23*
