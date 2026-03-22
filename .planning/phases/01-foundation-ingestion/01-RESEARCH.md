# Phase 1: Foundation & Ingestion - Research

**Researched:** 2026-03-22
**Domain:** Log ingestion pipeline: Vector collection, Kafka streaming, three-tier parsing, PostgreSQL storage, Redis deduplication
**Confidence:** MEDIUM (network restrictions prevented live doc verification; version numbers verified from registries, architecture patterns from training data)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **First device:** Suricata IDS via Syslog, EVE JSON format
2. **Kafka partitioning:** By device type (`raw-suricata`, `raw-firewall`)
3. **Parser output:** OCSF standard format to Elasticsearch
4. **Local dev:** Docker Compose (Vector + Kafka + Zookeeper + ES + Redis + PostgreSQL)
5. **Test data:** Qwen3-32B generates Suricata EVE JSON simulated alerts

### Claude's Discretion (research and recommend)
- Three-tier parser parameters (Drain clustering depth, timeout config)
- Redis deduplication window size and cache strategy
- Vector buffer size, retry policy
- PostgreSQL table schema and index strategy

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

## Summary

Phase 1 establishes the foundational log ingestion pipeline for SecAlert. The system will collect Suricata IDS alerts via Vector's syslog source, stream them through Kafka partitioned by device type, process them through a three-tier parser (template matching -> Drain clustering -> DSPy/LLM fallback), and store parsed OCSF-formatted events in PostgreSQL with Redis-based deduplication.

**Primary recommendation:** Build the pipeline incrementally: Vector syslog source -> Kafka (verify transport) -> three-tier parser (template + Drain + LLM) -> PostgreSQL storage. Use drain3 0.9.11 for the clustering layer, confluent-kafka 2.13.2 for Kafka clients, and Redis sliding window for deduplication.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drain3 | 0.9.11 | Log clustering (Drain algorithm) | Industry-standard log parsing library, 100K+ events/sec throughput |
| confluent-kafka | 2.13.2 | Kafka client for Python | High-performance, official Confluent maintained |
| redis | (latest) | Deduplication cache | Battle-tested for sliding window dedup |
| psycopg2-binary | 2.9.10 | PostgreSQL adapter | Standard PostgreSQL driver for Python |
| elasticsearch | 8.x / 9.x | Event storage + search | OCSF format storage target |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dspy | 2.0+ | LLM signature framework | Third-tier parser fallback |
| vllm | 0.3+ | Offline LLM inference | Qwen3-32B integration |
| PyYAML | 6.0+ | Configuration parsing | Vector configs, rules |
| pydantic | 2.0+ | Data validation | OCSF event models |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| confluent-kafka | kafka-python | kafka-python is deprecated (last release 2.0.2), confluent-kafka is actively maintained with better performance |
| drain3 | logparser | drain3 is more actively maintained, better documented |
| Redis dedup | PostgreSQL dedup | Redis has better performance for high-volume dedup checks |

**Installation:**
```bash
pip install drain3==0.9.11 confluent-kafka==2.13.2 redis psycopg2-binary elasticsearch pydantic PyYAML
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── collector/              # Vector configuration
│   ├── configs/           # Vector YAML configs per source type
│   └── docker/            # Vector container setup
├── parser/                # Three-tier parsing
│   ├── templates/         # Pre-built parsing templates (Suricata, etc.)
│   ├── drain/              # Drain clustering implementation
│   ├── dspy/               # DSPy signatures and programs
│   └── pipeline.py         # Parser pipeline orchestration
├── storage/               # Database interfaces
│   ├── postgres/          # PostgreSQL models and queries
│   ├── redis/             # Redis deduplication logic
│   └── elasticsearch/      # ES client for OCSF events
├── kafka/                  # Kafka consumers/producers
│   ├── consumer.py        # Base consumer with consumer group
│   └── producer.py        # Vector-to-Kafka producer
├── docker/                # Docker Compose setup
│   └── compose.yaml       # Full local dev environment
└── tests/                 # Integration tests
```

### Pattern 1: Vector Syslog Source -> Kafka Sink
**What:** Configure Vector to receive syslog and forward to Kafka
**When to use:** Collection layer for network devices (firewall, IDS)
**Example (Vector config):**
```yaml
sources:
  syslog_source:
    type: syslog
    address: 0.0.0.0:514
    mode: tcp                              # or udp for BSD syslog
    framing:
      method: lines                        # BSD syslog uses line framing
    parsing:
      message_format: auto                # Detect format automatically
    max_frame_size: 65536

sinks:
  kafka_sink:
    type: kafka
    inputs: [syslog_source]
    bootstrap_servers: kafka:9092
    topic: raw-suricata
    compression: gzip                      # Reduce network/memory
    acks: all                              # Wait for all replicas
    batch_size: 16384                      # Tune for throughput
    linger_ms: 5                            # Small batch window
```
**Source:** Vector documentation (training data, not verified live)

### Pattern 2: Three-Tier Parser Pipeline
**What:** Fallback parsing: exact template match -> Drain clustering -> LLM inference
**When to use:** Processing heterogeneous security device logs
**Example (pipeline flow):**
```python
class ThreeTierParser:
    def __init__(self):
        self.template_matcher = TemplateMatcher()      # Layer 1
        self.drain_clusterer = DrainParser()           # Layer 2
        self.llm_parser = LogParserProgram()           # Layer 3 (DSPy)

    def parse(self, raw_log: str, source_type: str) -> dict:
        # Layer 1: Exact template match
        if template := self.template_matcher.match(raw_log, source_type):
            return self._apply_template(raw_log, template)

        # Layer 2: Drain clustering
        if cluster := self.drain_clusterer.parse(raw_log):
            return self._normalize_to_ocsf(cluster)

        # Layer 3: LLM inference
        return self.llm_parser.parse(raw_log, source_type)
```
**Source:** ARCHITECTURE.md (in-house pattern, not external)

### Pattern 3: Redis Sliding Window Deduplication
**What:** Track seen events with TTL-based sliding window
**When to use:** High-volume alert deduplication
**Example:**
```python
import redis
import hashlib
import json

class RedisDedup:
    def __init__(self, redis_client: redis.Redis, window_seconds: int = 86400):
        self.redis = redis_client
        self.window = window_seconds

    def is_duplicate(self, event: dict) -> bool:
        key = self._make_key(event)
        # SET with NX (only if not exists) and EX (expiry)
        result = self.redis.set(key, "1", nx=True, ex=self.window)
        return result is None  # None means key existed (duplicate)

    def _make_key(self, event: dict) -> str:
        # Hash of source_type + alert_signature + src_ip + dest_ip + time_bucket
        normalized = f"{event.get('source_type')}:{event.get('alert_signature')}:{event.get('src_ip')}:{event.get('dest_ip')}"
        return f"dedup:{hashlib.md5(normalized.encode()).hexdigest()}"
```
**Source:** Common industry pattern (not specific to any library)

### Pattern 4: OCSF Event Normalization
**What:** Map device-specific fields to OCSF standard schema
**When to use:** All parsed events before storage
**Example (Suricata EVE JSON -> OCSF):**
```python
# Suricata EVE JSON fields
suricata_event = {
    "timestamp": "2026-03-22T10:00:00.000000Z",
    "event_type": "alert",
    "src_ip": "192.168.1.100",
    "src_port": 12345,
    "dest_ip": "10.0.0.1",
    "dest_port": 443,
    "alert": {
        "signature": "ET SCAN Potential SSH Scan",
        "severity": 2
    }
}

# OCSF format
ocsf_event = {
    "event_id": generate_uuid(),
    "timestamp": suricata_event["timestamp"],
    "source_type": "ids",
    "source_name": "suricata-01",
    "event_type": suricata_event["event_type"],
    "network": {
        "src_ip": suricata_event["src_ip"],
        "src_port": suricata_event["src_port"],
        "dst_ip": suricata_event["dest_ip"],
        "dst_port": suricata_event["dest_port"],
        "protocol": "TCP"
    },
    "security": {
        "severity": map_suricata_severity(suricata_event["alert"]["severity"]),
        "action": "detected",
        "alert": {
            "signature_name": suricata_event["alert"]["signature"]
        }
    }
}
```

### Pattern 5: Kafka Consumer Group Processing
**What:** Parallel consumption with partition assignment
**When to use:** Scaling parser workers
```python
from confluent_kafka import Consumer, KafkaError

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'parser-suricata',        # Consumer group per device type
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': True,
    'max.poll.interval.ms': 300000        # 5 min for batch processing
})

consumer.subscribe(['raw-suricata'])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    if msg.error():
        if msg.error().code() == KafkaError._PARTITION_EOF:
            continue
        else:
            raise KafkaException(msg.error())
    # Process message
    event = json.loads(msg.value().decode('utf-8'))
    parsed = parser.parse(event)
    storage.store(parsed)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log clustering | Custom clustering algorithm | drain3 | Drain algorithm is proven for 100K+ events/sec, handles variable log formats |
| Kafka consumer | Raw socket implementation | confluent-kafka | Handles rebalancing, offset management, reliable delivery |
| Redis dedup | Custom Bloom filter + TTL | Redis Set with NX+EX | Single atomic operation, proven reliability |
| OCSF mapping | Custom field mapping | Pydantic models | Type safety, validation, self-documenting |

**Key insight:** High-volume log processing has well-solved problems. Building custom solutions for clustering, message queue consumption, and deduplication introduces subtle bugs and performance issues that battle-tested libraries handle correctly.

---

## Runtime State Inventory

> This section is NOT applicable to Phase 1 - it is a greenfield phase with no existing runtime state to inventory. All components are newly created.

**Stored data:** None — Phase 1 creates the initial data pipeline, no pre-existing databases
**Live service config:** None — no external services configured prior to this phase
**OS-registered state:** None — no OS-level registrations (Task Scheduler, pm2, etc.)
**Secrets/env vars:** None — no pre-existing secrets for this phase
**Build artifacts:** None — no installed packages or built artifacts prior to Phase 1

---

## Common Pitfalls

### Pitfall 1: Vector Syslog Framing Mode Mismatch
**What goes wrong:** Suricata sends BSD syslog, but Vector configured for RFC5424 (or vice versa), resulting in parse failures
**Why it happens:** BSD syslog uses newline-delimited messages; RFC5424 uses octet-counting framing. Default config may not match.
**How to avoid:** Explicitly set `mode: tcp` with `framing.method: lines` for Suricata, or detect with `message_format: auto`
**Warning signs:** Vector logs showing "Failed to parse syslog message", high dropped events count

### Pitfall 2: Kafka Consumer Lag Under Load
**What goes wrong:** Parser cannot keep up with Kafka message rate, consumer lag grows unbounded
**Why it happens:** Synchronous parsing (especially LLM tier), no batching, insufficient consumer partitions
**How to avoid:** Use batch consumption (poll multiple messages), async processing, partition by device type for parallelism
**Warning signs:** `consumer.lag` metric increasing, Kafka consumer group showing `consumer_lag` > 10000

### Pitfall 3: Drain Cluster Explosion
**What goes wrong:** Drain creates too many clusters, defeating the purpose of clustering
**Why it happens:** Logs have high variability (timestamps, IPs, ports in messages), not enough delimiter configuration
**How to avoid:** Configure `extra_delimiters` in drain3 to treat IPs, ports, timestamps as delimiters: `[" ", ":", "-", "."]`
**Warning signs:** drain3 parser showing > 10000 clusters for a single device type

### Pitfall 4: Redis Memory Exhaustion from Dedup
**What goes wrong:** Dedup keys accumulate faster than TTL expires, Redis memory grows
**Why it happens:** High event volume with short TTL creates many keys; TTL cleanup may lag
**How to avoid:** Use `maxmemory-policy: allkeys-lru` eviction policy, monitor Redis `used_memory`, size sliding window appropriately (24h typical)
**Warning signs:** Redis `used_memory_human` constantly growing, `evicted_keys` > 0

### Pitfall 5: PostgreSQL Write Bottleneck
**What goes wrong:** Synchronous writes to PostgreSQL slow down the parsing pipeline
**Why it happens:** Each parsed event triggers a database write; no batching
**How to avoid:** Use connection pooling (psycopg2.pool), batch inserts (executemany), consider async writes
**Warning signs:** Parser processing time increasing, PostgreSQL connections exhausting

---

## Code Examples

### drain3 Configuration for Suricata
```python
# Source: drain3 documentation (training data)
from drain3 import Drain

parser = Drain(
    max_depth=4,              # Max token tree depth
    max_children=100,         # Max children per non-leaf node
    extra_delimiters=[        # Treat these as token separators
        " ", ":", "-", ".",   # IPs, ports, timestamps
        "/", "\\", "@", "#",
        "[", "]", "(", ")"
    ],
    trace_anomaly=False       # Set True for debugging unparsed logs
)

# Parse a log message
log_template, log_params = parser.parse("Suricata alert: ET SCAN SSH scan from 192.168.1.100:12345")
# Returns (template_id, {ip: "192.168.1.100", port: "12345", ...})
```

### Suricata EVE JSON to OCSF Mapping
```python
# Based on OCSF schema (training data)
def map_suricata_to_ocsf(eve_event: dict, source_name: str) -> dict:
    severity_map = {1: "low", 2: "medium", 3: "high"}
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": eve_event.get("timestamp"),
        "source_type": "ids",
        "source_name": source_name,
        "event_type": eve_event.get("event_type"),
        "network": {
            "src_ip": eve_event.get("src_ip"),
            "src_port": eve_event.get("src_port"),
            "dst_ip": eve_event.get("dest_ip"),
            "dst_port": eve_event.get("dest_port"),
            "protocol": eve_event.get("proto", "TCP").upper()
        },
        "security": {
            "severity": severity_map.get(eve_event.get("alert", {}).get("severity"), "unknown"),
            "action": "detected",
            "alert": {
                "signature_name": eve_event.get("alert", {}).get("signature"),
                "category_uid": 1  # Detection category
            }
        }
    }
```

### PostgreSQL Alert Storage Schema
```sql
-- Based on common security alert schemas (training data)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    source_type VARCHAR(50) NOT NULL,      -- e.g., "ids", "firewall"
    source_name VARCHAR(100) NOT NULL,      -- e.g., "suricata-01"
    event_type VARCHAR(50) NOT NULL,        -- e.g., "alert", "flow"
    src_ip INET,
    src_port INTEGER,
    dst_ip INET,
    dst_port INTEGER,
    protocol VARCHAR(20),
    severity VARCHAR(20),                   -- "low", "medium", "high", "critical"
    alert_signature VARCHAR(500),
    raw_event JSONB NOT NULL,               -- Original event
    ocsf_event JSONB NOT NULL,              -- Normalized OCSF event
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_source_type ON alerts(source_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_src_ip ON alerts(src_ip);
CREATE INDEX idx_alerts_dst_ip ON alerts(dst_ip);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Partial index for active alerts only
CREATE INDEX idx_alerts_active_high ON alerts(timestamp DESC)
    WHERE severity IN ('high', 'critical');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom log parsers | Drain algorithm + DSPy | ~2018+ | 10x faster parsing, handles unknown formats |
| Direct DB writes | Kafka + async consumers | ~2015+ | Decoupled pipeline, backpressure handling |
| Exact match dedup | Bloom filter / sliding window | ~2010+ | Constant memory vs linear growth |
| Per-device parsers | Three-tier fallback | Project-specific | Unknown device support |

**Deprecated/outdated:**
- `kafka-python` library: Deprecated, no longer maintained (last release 2.0.2 in 2019). Use `confluent-kafka` instead.
- XML-based log formats: Most modern security devices use JSON (including Suricata EVE JSON)
- Single-tier parsing: Modern approach uses layered parsing with LLM fallback for unknown formats

---

## Open Questions

1. **Drain3 depth parameter tuning**
   - What we know: `max_depth=4` is default, affects token tree depth
   - What's unclear: Optimal depth for security device logs varies; may need experimentation
   - Recommendation: Start with default (4), monitor cluster count, increase if explosion occurs

2. **Redis vs PostgreSQL for deduplication**
   - What we know: Redis has better performance for high-volume in-memory dedup
   - What's unclear: Whether PostgreSQL with proper indexing could suffice for 30K events/day
   - Recommendation: Use Redis for Phase 1 (as per locked decision), evaluate PostgreSQL-only later if Redis adds operational complexity

3. **Vector buffer size for burst traffic**
   - What we know: Vector has internal buffers for handling backpressure
   - What's unclear: Optimal buffer size for Suricata burst traffic (e.g., mass scanning alerts)
   - Recommendation: Start with default, monitor `vector_buffer_new` metrics, tune if drops occur

4. **Elasticsearch vs PostgreSQL as primary storage**
   - What we know: ROADMAP says PostgreSQL for Phase 1, Elasticsearch for later phases
   - What's unclear: Whether PostgreSQL can handle 30K/day query patterns efficiently
   - Recommendation: Follow locked decision (PostgreSQL for Phase 1), plan migration to ES in Phase 2

---

## Validation Architecture

> Validation architecture is **not included** because `.planning/config.json` specifies `workflow.nyquist_validation: false`. This project does not use the nyquist validation framework for automated testing.

### Test Framework
**Framework:** pytest (Python standard)
**Config file:** `pytest.ini` or `pyproject.toml` (to be created in Wave 0)
**Quick run command:** `pytest tests/ -x -v`
**Full suite command:** `pytest tests/ --tb=short`

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Manual/Automated |
|--------|----------|-----------|------------------|
| PARSE-01 | Auto-recognize unknown log formats | Manual | Requires Qwen3-32B access |
| INFRA-01 | Vector receives Suricata logs | Automated | Integration test with mock syslog |
| INFRA-02 | Kafka no message loss | Automated | Load test with message verification |
| INFRA-03 | Three-tier parser processes logs | Automated | Unit test per tier |

### Wave 0 Gaps
- [ ] `tests/` directory does not exist — create for Phase 1 tests
- [ ] `pytest.ini` or `pyproject.toml` — configure pytest for Python project
- [ ] Mock syslog fixture — for testing Vector source configuration
- [ ] Kafka test consumer/producer — for integration testing message flow

---

## Sources

### Primary (HIGH confidence — version numbers verified from package registries)
- `pip index versions drain3` — verified drain3 0.9.11 is latest
- `pip index versions confluent-kafka` — verified confluent-kafka 2.13.2 is latest
- `pip index versions psycopg2-binary` — verified psycopg2-binary 2.9.10 is latest
- `pip index versions elasticsearch` — verified elasticsearch 9.0.5 / 8.x available

### Secondary (MEDIUM confidence — training data, not verified due to network restrictions)
- Vector syslog source configuration (mode, framing options)
- Vector Kafka sink configuration (acks, batch settings)
- Kafka topic/consumer group patterns
- drain3 algorithm parameters
- OCSF schema field mappings
- PostgreSQL schema patterns
- Redis deduplication patterns

### Tertiary (LOW confidence — marked for validation)
- Specific Vector configuration parameter names (may have changed in recent versions)
- drain3 configuration recommendations for security logs
- OCSF exact field names and structure
- Docker Compose best practices for this specific stack

---

## Metadata

**Confidence breakdown:**
- Standard Stack: MEDIUM — version numbers verified, but library specifics not verified due to network restrictions
- Architecture: MEDIUM — patterns from training data, not cross-referenced with current documentation
- Pitfalls: MEDIUM — common pitfalls well-documented in industry, project-specific tuning needed

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (30 days for stable stack components; versions confirmed via registries)
**Network restrictions:** Live documentation access blocked for most domains; training data used as primary source
