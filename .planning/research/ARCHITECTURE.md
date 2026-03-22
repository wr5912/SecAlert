# Architecture Patterns: Security Alert Analysis / SIEM Systems

**Domain:** Security Information and Event Management (SIEM) / Security Alert Analysis
**Researched:** 2026-03-22
**Confidence:** LOW (WebSearch unavailable; based on training data, needs verification)

## Executive Summary

SIEM systems follow a layered architecture pattern: **Collection -> Normalization -> Storage -> Detection -> Correlation -> Alerting -> Presentation**. For SecAlert's requirements (30k+ daily alerts, heterogeneous sources, LLM-powered analysis, attack chain reconstruction), the architecture must emphasize scalability at the ingestion layer and flexibility at the detection layer.

---

## Standard SIEM Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  (Dashboards, Alert Triage, Investigation, Reporting)          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       ALERTING LAYER                            │
│  (Alert Generation, Severity Scoring, Notification Routing)     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    CORRELATION ENGINE                            │
│  (Attack Chain Reconstruction, Cross-Source Correlation)       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     DETECTION ENGINE                            │
│  (Rule-based Detection, ML Anomaly Detection, LLM Analysis)   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   NORMALIZATION LAYER                           │
│  (Log Parsing, Field Extraction, Schema Mapping)               │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   INGESTION LAYER                               │
│  (Multi-source Collection, Protocol Adapters, Load Balancing) │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                               │
│  (Hot Storage for active alerts, Cold Storage for historical)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Ingestion Layer

**Responsibility:** Collect logs/alerts from heterogeneous security devices in real-time or batch.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Collecters/Agents** | Lightweight agents deployed near data sources | Must handle unknown formats (firewall, IDS, endpoint, cloud) |
| **Protocol Adapters** | Syslog, HTTP/Webhook, Kafka, File-based, API | Qwen3-32B needs standardized input |
| **Load Balancer** | Distribute ingestion across nodes | 30k+/day requires horizontal scaling |
| **Message Queue** | Buffer between ingestion and processing | Decouples fast ingestion from processing |

**Key Challenge for SecAlert:** Unknown log formats from heterogeneous devices. The PROJECT.md mentions a "三层解析架构" (three-layer parsing) approach: template first, then Drain clustering, then LLM fallback.

---

### 2. Normalization Layer

**Responsibility:** Parse raw logs into structured, queryable format with common schema.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Parser Engine** | Regex, JSON, CSV, XML parsing | Must handle unknown formats via zero-shot |
| **Schema Mapper** | Map vendor-specific fields to common ontology (CEF, OCSF, LEEF) | Critical for correlation across sources |
| **Field Extractor** | Extract key fields (timestamp, source IP, destination IP, alert type) | Input for detection engine |
| **Enrichment Engine** | Add context (geo-IP, threat intel, asset data) | Improves detection accuracy |

**Key Challenge for SecAlert:** Zero-sample learning for unknown formats. LLM likely needed to infer structure.

---

### 3. Storage Layer

**Responsibility:** Persist normalized events for real-time查询 and historical analysis.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Hot Storage** | Elasticsearch, OpenSearch, TimescaleDB for active alerts | Real-time alerting requires fast reads |
| **Cold Storage** | Object storage (S3-compatible), Apache Parquet | Cost-effective historical retention |
| **Data Lake** | Raw event archival for forensic analysis | Needed for attack chain reconstruction |
| **Time-series DB** | Metrics aggregation, trend analysis | Useful for anomaly detection |

**Architecture Decision:** SecAlert likely needs Elasticsearch/OpenSearch for hot storage (real-time search) with S3 for historical archival.

---

### 4. Detection Engine

**Responsibility:** Identify potential threats using multiple detection methods.

| Detection Method | How It Works | SecAlert Relevance |
|------------------|--------------|---------------------|
| **Rule-based** | YARA, Sigma rules, CVE matching | Known threat patterns |
| **Signature-based** | Hash matching, pattern matching | Commodity malware |
| **Anomaly-based (ML)** | Statistical models, behavioral baseline | Unknown threats |
| **LLM-based** | Natural language analysis, context reasoning | Core value-add for SecAlert |

**SecAlert's Three-Layer Detection (from PROJECT.md):**
1. Template matching (fast, high confidence for known formats)
2. Drain clustering (unsupervised聚类 for unknown formats)
3. LLM analysis (Qwen3-32B for complex reasoning, false positive filtering)

---

### 5. Correlation Engine

**Responsibility:** Link related events across time and sources to reconstruct attack chains.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Temporal Correlation** | Group events by time window | Detect multi-stage attacks |
| **Entity Linking** | Correlate by IP, user, hostname | Attack chain reconstruction |
| **Attack Graph** | Build attacker's path | Visualize complete attack story |
| **Kill Chain Mapping** | Map to MITRE ATT&CK framework | Standardized categorization |

**Key Challenge for SecAlert:** Attack chain reconstruction from heterogeneous sources without expert analyst knowledge.

---

### 6. Alerting Layer

**Responsibility:** Generate actionable alerts with severity scoring.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Alert Generator** | Create alerts from detection results | Must reduce false positives |
| **Severity Scorer** | Calculate criticality (CVSS-like) | Focus user attention on real threats |
| **Deduplication** | Suppress duplicate alerts | Critical for 30k+/day volume |
| **Notification Router** | Route to UI, email, Slack | Simple UX for non-experts |

**SecAlert Core Value:** Automatic false positive filtering — only present truly actionable alerts to operators.

---

### 7. Presentation Layer

**Responsibility:** Enable operators to investigate and respond to alerts.

| Component | Purpose | SecAlert Relevance |
|-----------|---------|-------------------|
| **Alert Dashboard** | List active alerts, severity, status | Primary interface for operators |
| **Alert Detail View** | Full context, raw logs, enriched data | Investigation without expertise |
| **Attack Chain Viewer** | Visual representation of kill chain | Make complex attacks understandable |
| **Recommendation Panel** | Simple remediation steps | Non-expert operators need guidance |
| **Reporting** | Compliance reports, trend analysis | Management visibility |

**Design Principle:** "极度简单" (extremely simple) — operators should not need security expertise.

---

## SecAlert-Specific Architecture Recommendations

Based on PROJECT.md requirements, the architecture should emphasize:

### Data Flow for SecAlert

```
[异构安全设备]
      │
      ▼
[Ingestion Layer] ──► [Message Queue (Kafka)]
      │                      │
      │                      ▼
      │              [Normalization Layer]
      │                      │
      │                      ▼
      │              [Storage Layer]
      │               (Elasticsearch + S3)
      │                      │
      │                      ▼
      │              [Detection Engine]
      │               ┌──────┼──────┐
      │               ▼      ▼      ▼
      │           [模板]  [Drain]  [LLM]
      │               └──────┬──────┘
      │                      │
      │                      ▼
      │              [Correlation Engine]
      │               (Attack Chain)
      │                      │
      │                      ▼
      │              [Alerting Layer]
      │            (Filtered, Scored)
      │                      │
      │                      ▼
      └──────────► [Presentation Layer]
```

### Critical Architectural Decisions

| Decision | Rationale | Implication |
|----------|-----------|-------------|
| **Message Queue (Kafka)** | Decouples ingestion from processing; handles 30k+/day burst | Ensures no data loss during processing spikes |
| **Elasticsearch** | Fast full-text search, aggregations for dashboards | Real-time alert listing and search |
| **Three-Layer Parsing** | Balance speed (template) with flexibility (LLM) | Avoids LLM fatigue, controls cost |
| **LLM for Everything** | Qwen3-32B for parsing, detection, correlation, recommendations | Single inference engine simplifies deployment |

---

## Scalability Considerations

| Scale | Challenge | Approach |
|-------|-----------|----------|
| **100 alerts/day** | Low volume, single node sufficient | Standalone deployment |
| **1,000 alerts/day** | Moderate volume, batching beneficial | Scheduled LLM inference |
| **10,000 alerts/day** | High volume, parallel processing needed | Multiple workers, async LLM |
| **30,000+ alerts/day** | Enterprise scale | Horizontal scaling, aggressive filtering |

**SecAlert Target:** 30k+/day — requires horizontal scaling at ingestion and async processing for LLM operations.

---

## Anti-Patterns to Avoid

### 1. Monolithic Detection
**What:** Single detection engine handling all alert types
**Why bad:** Cannot scale LLM inference, creates bottleneck
**Instead:** Tiered detection with early filtering

### 2. Synchronous LLM Calls
**What:** Calling LLM for every alert synchronously
**Why bad:** 30k alerts/day would require 30k+ LLM inferences, prohibitive cost/latency
**Instead:** Batch processing, async inference, aggressive pre-filtering

### 3. Generic Normalization
**What:** Mapping all logs to minimal common schema
**Why bad:** Loses vendor-specific context valuable for detection
**Instead:** Preserve raw fields alongside normalized fields

### 4. Alert Explosion
**What:** Correlating too loosely, generating many alerts per incident
**Why bad:** Defeats purpose of filtering for non-experts
**Instead:** Strict correlation rules, single alert per attack chain

---

## Known SIEM Architecture References

These are reference architectures from established vendors (training data, unverified):

| Vendor/Project | Architecture Pattern | Notable Features |
|----------------|----------------------|------------------|
| **Elastic Security** | Elasticsearch + Kibana stack | Built-in ML, scalable |
| **Splunk** | Search-based, SPL query language | Powerful but expensive |
| **IBM QRadar** | Tiered architecture, offense management | Proprietary |
| **Open Source SIEM (Wazuh)** | Agent-based, rules-driven | OSS alternative |
| **Microsoft Sentinel** | Cloud-native, Logic Apps | SaaS, AI-powered |

**Note:** SecAlert's architecture differs significantly — designed for non-expert operators with LLM-centric analysis rather than expert-driven investigation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Layered architecture pattern | MEDIUM | Established pattern, can verify with docs |
| Component responsibilities | MEDIUM | Standard SIEM knowledge |
| Scalability considerations | LOW | Training data, needs validation |
| Specific technology choices (Elasticsearch, Kafka) | MEDIUM | Common choices, proven at scale |
| Three-layer parsing approach | HIGH | Explicitly mentioned in PROJECT.md |

---

## Sources

**Unable to verify due to WebSearch unavailability.** The following should be validated when service is restored:

- Elastic Security documentation (elastic.co)
- Apache Kafka documentation
- MITRE ATT&CK framework for kill chain mapping
- Sigma rule syntax for rule-based detection
- Drain parser algorithm for log clustering

**Recommendation:** Run web searches to verify current best practices before finalizing architecture.
