# Technology Stack

**Project:** SecAlert (网络安全告警分析系统)
**Researched:** 2026-03-22
**Confidence:** MEDIUM (training data, web search restricted)

## Recommended Stack

### Core Framework

| Technology | Purpose | Why |
|------------|---------|-----|
| **Python 3.11+** | Primary language | Best ecosystem for LLM integration, security tooling (Scapy, YARA), rapid development |
| **FastAPI** | API framework | Async support, automatic OpenAPI docs, Pydantic validation |
| **Pydantic** | Data validation | Strong typing for alert schemas, LLM output parsing |

### Log Ingestion & Processing

| Technology | Purpose | Why |
|------------|---------|-----|
| **Vector** | Log collection/parsing | Native support for 70+ sources, Lua transforms, high performance (written in Rust). Preferred over Fluentd/Logstash for greenfield |
| **Apache Kafka** | Message queue | Decouples ingestion from processing, handles 30k+/day volume, battle-tested |
| **Drain algorithm** | Log template clustering | Industry standard for log parsing (used in幽 opensource tools). Greedy parsing for speed |

### Storage

| Technology | Purpose | Why |
|------------|---------|-----|
| **PostgreSQL** | Primary database | Structured alert storage, JSONB for flexible schemas, mature, private deployment friendly |
| **Redis** | Cache/queue | Alert deduplication, session cache, pub/sub for real-time alerts |
| **Elasticsearch** | Log search (optional) | Only if full-text search on historical logs required; adds complexity |

### LLM Integration

| Technology | Purpose | Why |
|------------|---------|-----|
| **LangChain** or **LlamaIndex** | LLM orchestration | Abstracts LLM calls, prompt templating, chain composition. LangChain more popular, LlamaIndex better for retrieval |
| **vLLM** or **Ollama** | Model serving | vLLM for production throughput, Ollama for simpler deployment |
| **Qwen3-32B** (already deployed) | AI inference | Private deployment, no external API dependency |

### Alert Analysis Pipeline

| Technology | Purpose | Why |
|------------|---------|-----|
| **Suricata** or **Snort** rules | Rule-based detection | Complementary to LLM for known patterns |
| **MITRE ATT&CK** framework | Attack mapping | Standard taxonomy for attack chain reconstruction |
| **NetworkX** or **igraph** | Graph operations | Attack chain visualization and correlation |

### Visualization & Dashboard

| Technology | Purpose | Why |
|------------|---------|-----|
| **Grafana** | Metrics dashboard | Industry standard, works with Prometheus/Elasticsearch |
| **Custom Web UI** (FastAPI + HTMX or React) | Alert management UI | Simple CRUD for non-expert users |

---

## Architecture Overview

```
[Security Devices] → [Vector/Fluentd] → [Kafka] → [Alert Processor]
                                                      ↓
                                              [Drain Parser] → [LLM Analysis]
                                                      ↓
                                              [PostgreSQL + Redis]
                                                      ↓
                                              [FastAPI Backend]
                                                      ↓
                                              [Grafana + Web UI]
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Log collection | Vector | Fluentd/Logstash | Vector is faster, compiled, but Fluentd has more community filters |
| Message queue | Kafka | RabbitMQ | Kafka better for high-volume, ordered processing; RabbitMQ for simpler deployments |
| LLM orchestration | LangChain | Direct API calls | LangChain adds useful abstractions but can be complex; direct calls acceptable for simple chains |
| Time-series DB | PostgreSQL | TimescaleDB | PostgreSQL sufficient; add TimescaleDB only if querying large time ranges |
| Full-text search | PostgreSQL tsvector | Elasticsearch | ES adds significant complexity; PostgreSQL tsvector adequate for alert volumes |

---

## Tech Stack Summary

**Core:** Python 3.11+ / FastAPI / Pydantic
**Ingestion:** Vector → Kafka
**Storage:** PostgreSQL + Redis
**LLM:** LangChain + Qwen3-32B (via vLLM)
**Visualization:** Grafana + minimal web UI

**Rationale:** This stack prioritizes:
1. Private deployment (no cloud dependencies)
2. High volume handling (Kafka + Vector)
3. LLM integration (LangChain abstraction over Qwen3-32B)
4. Operational simplicity (PostgreSQL over Elasticsearch, Grafana for metrics)

---

## Gaps & Validation Needed

- [ ] **Drain algorithm implementation** — verify current best practice for log clustering at scale
- [ ] **Vector vs Fluentd benchmark** — for 30k alerts/day, either likely sufficient
- [ ] **LangChain vs direct API** — depending on chain complexity, may simplify to direct LLM calls
- [ ] **PostgreSQL vs specialized time-series DB** — may need TimescaleDB if query performance degrades

---

## Sources

- Confidence Level: **MEDIUM** — Based on training data, web search restricted in this environment
- Training data covers through ~2025-06 with reasonable coverage of security stack trends
- Recommend validation with Context7 or official docs before finalizing specific library versions
