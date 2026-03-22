# SecAlert Research Summary

**Project:** Security Alert Analysis System (网络安全告警分析系统)
**Synthesized:** 2026-03-22
**Overall Confidence:** MEDIUM (based on combined research with low verification due to WebSearch restrictions)

---

## Executive Summary

SecAlert is an AI-powered security alert analysis system designed to help non-expert IT operators handle 30,000+ daily security alerts from heterogeneous security devices. Unlike traditional SIEMs that require security expertise to operate, SecAlert's core value proposition is automatic false positive filtering and attack chain reconstruction, presented through an "extremely simple" interface.

The recommended approach combines a battle-tested stack (Python/FastAPI, Kafka, PostgreSQL, Redis) with a three-layer parsing architecture (template matching, Drain clustering, LLM inference via Qwen3-32B) to handle unknown log formats. The architecture follows a standard SIEM pattern but with LLM at the center of detection, correlation, and recommendation generation. The primary risks are alert fatigue from poor filtering, trust erosion from high false positive rates, and unknown format blindness during ingestion. Mitigation requires operator feedback loops, time-boxed suppression rules, and alerting on unparsed logs.

---

## Key Findings

### From STACK.md (Confidence: MEDIUM)

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Python 3.11+** | Primary language | Best LLM integration ecosystem, security tooling |
| **FastAPI** | API framework | Async support, OpenAPI docs, Pydantic validation |
| **Vector** | Log collection | Native 70+ source support, Lua transforms, Rust performance |
| **Apache Kafka** | Message queue | Decouples ingestion from processing, handles 30k+/day |
| **PostgreSQL** | Primary storage | JSONB flexibility, mature, private deployment friendly |
| **Redis** | Cache/queue | Deduplication, session cache, pub/sub |
| **LangChain** | LLM orchestration | Abstracts LLM calls, prompt templating, chain composition |
| **vLLM** | Model serving | Production throughput for Qwen3-32B |
| **Grafana** | Metrics | Industry standard dashboarding |

**Core Stack:** Python/FastAPI/Pydantic + Vector/Kafka + PostgreSQL/Redis + LangChain/Qwen3-32B

**Gaps Identified:** Drain algorithm implementation details, Vector vs Fluentd benchmark, LangChain complexity vs direct API calls.

---

### From FEATURES.md (Confidence: MEDIUM-HIGH)

#### Table Stakes (Must-Have)
- Log ingestion via Vector
- Log parsing/normalization (3-tier: template, Drain, LLM)
- Alert storage and search (Elasticsearch)
- Basic alert filtering
- Alert triage UI (non-expert friendly)
- Severity/priority levels (Critical, High, Medium, Low)

#### Differentiators (Core Value)
- **False Positive Auto-Ignoring** (Very High Complexity) - Core promise: 30k+ alerts filtered to actionable set
- **Attack Chain Reconstruction** (High) - Group related alerts across time/devices into coherent narrative
- **AI-Powered Analysis** (Very High) - LLM understands context, generates plain-language summaries
- **Unknown Format Auto-Adaptation** (Very High) - Zero-configuration for new devices via DSPy + Qwen3-32B
- **Simple Recommendation Generation** (High) - Plain language remediation steps for non-experts

#### Anti-Features (Explicitly NOT Building)
- Automatic blocking/response (too risky for non-experts)
- Professional security analyst tools
- Real-time blocking/prevention
- Custom rule authoring UI
- Full SIEM feature parity
- External cloud dependencies
- Multi-tenant SaaS

#### MVP Phase Recommendations
1. **Phase 1 - Foundation:** Log ingestion, 1-tier parsing (DSPy/LLM), Elasticsearch storage, basic triage UI
2. **Phase 2 - Core Value:** False positive filtering, AI analysis, recommendations, cross-device correlation
3. **Phase 3 - Advanced:** Attack chain reconstruction, ATT&CK mapping, risk scoring, threat intel

---

### From ARCHITECTURE.md (Confidence: LOW-MEDIUM)

#### Standard SIEM Layered Architecture
```
[Ingestion] → [Normalization] → [Storage] → [Detection] → [Correlation] → [Alerting] → [Presentation]
```

#### SecAlert Data Flow
```
[Security Devices] → [Vector] → [Kafka] → [Alert Processor]
                                                ↓
                                         [3-Tier Parser]
                                    [Template|Drain|LLM]
                                                ↓
                                        [PostgreSQL + Redis]
                                                ↓
                                        [FastAPI Backend]
                                                ↓
                                   [Alerting + Presentation]
```

#### Critical Architectural Decisions
| Decision | Rationale |
|----------|-----------|
| **Kafka message queue** | Decouples ingestion from processing; handles 30k+/day burst |
| **Elasticsearch for hot storage** | Fast full-text search, real-time alerting |
| **Three-layer parsing** | Balances speed (template) with flexibility (LLM), controls cost |
| **LLM for parsing, detection, correlation, recommendations** | Single inference engine (Qwen3-32B) simplifies deployment |

#### Anti-Patterns to Avoid
1. **Monolithic detection** - Single engine creates bottleneck; use tiered detection
2. **Synchronous LLM calls** - 30k+ alerts/day would require prohibitive inference; use async batching
3. **Generic normalization** - Loses vendor-specific context; preserve raw fields alongside normalized
4. **Alert explosion** - Loose correlation defeats filtering purpose; strict rules, single alert per chain

#### Scalability Targets
| Volume | Approach |
|--------|----------|
| 30,000+/day | Horizontal scaling at ingestion, async LLM, aggressive pre-filtering |

---

### From PITFALLS.md (Confidence: LOW)

#### Critical Pitfalls (Must Prevent)

| Pitfall | Prevention Strategy |
|---------|---------------------|
| **Alert fatigue from undifferentiated flood** | Multi-tier prioritization; suppress known false positives; risk scoring |
| **Trust erosion from high false positive rate** | Operator feedback loop; continuous rule tuning; measure FP rate, target <30% |
| **Alert overload without context** | Attack chain visualization; timeline view; entity correlation |
| **Generic unactionable recommendations** | Tie recommendations to CMDB; asset-targeted ("Isolate server X from VLAN Y") |
| **Unknown format blindness** | Layered parsing with LLM fallback; alert on unparsed logs |

#### Moderate Pitfalls

| Pitfall | Prevention Strategy |
|---------|---------------------|
| **Tuning debt accumulation** | Time-boxed suppression rules with mandatory review; annual suppression audit |
| **Single-point-of-failure alert channels** | Multiple channels (email + SMS + direct); pipeline health monitoring |
| **Ignoring alert velocity** | Rate-based alerting (100 failed logins/minute = anomaly); dynamic baselining |

#### Phase-Specific Warnings
| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Log parsing | Unknown format blindness | Layered parsing with LLM fallback; alert on unparsed logs |
| False positive filtering | Trust erosion | Feedback loop essential; measure and publish FP rate |
| Attack chain reconstruction | Alert overload without context | Build correlation engine before UI; test with real multi-alert scenarios |
| Recommendation generation | Generic unactionable advice | Tie recommendations to CMDB; operator-tested |
| Rule/tuning system | Tuning debt | Time-boxed suppressions; periodic rule review |
| Alert delivery | Single-point-of-failure channels | Redundant delivery from day one |

---

## Implications for Roadmap

### Suggested Phase Structure

#### Phase 1: Foundation & Ingestion
**Rationale:** Nothing works without data. Ingestion must precede parsing, storage, and UI.

**Deliverables:**
- Vector-based log collection from heterogeneous security devices
- Kafka message queue for decoupled processing
- Basic storage layer (PostgreSQL + Redis)
- Basic alert triage UI (list/detail view)

**Pitfalls to Avoid:** Pitfall 5 (unknown format blindness) - implement layered parsing early

---

#### Phase 2: Core Value - Filtering & Analysis
**Rationale:** False positive filtering is the core promise. Must achieve before attack chain features.

**Deliverables:**
- Three-tier parsing (template → Drain → LLM)
- AI-powered false positive filtering
- Severity classification (Critical/High/Medium/Low)
- Simple recommendations generation (plain language)
- Operator feedback loop

**Pitfalls to Avoid:**
- Pitfall 2 (trust erosion) - implement feedback loop immediately; measure FP rate
- Pitfall 4 (generic recommendations) - tie to CMDB/asset database

---

#### Phase 3: Correlation & Attack Chains
**Rationale:** Attack chain reconstruction requires correlation engine; depends on Phase 2's enriched data.

**Deliverables:**
- Cross-device correlation
- Attack chain reconstruction and visualization
- ATT&CK framework mapping
- Risk scoring

**Pitfalls to Avoid:** Pitfall 3 (alert overload without context) - correlation engine must precede presentation

---

#### Phase 4: Hardening & Scale
**Rationale:** Enterprise requirements and operational sustainability.

**Deliverables:**
- Suppression rule management with time-boxing
- Multiple alert delivery channels
- Pipeline health monitoring
- Performance optimization for 30k+/day

**Pitfalls to Avoid:** Pitfall 6 (tuning debt), Pitfall 7 (single-point-of-failure channels)

---

### Research Flags

| Phase | Research Needed | Standard Patterns |
|-------|-----------------|-------------------|
| Phase 1 | Verify Vector configuration for specific device types | Standard log ingestion patterns; Kafka best practices |
| Phase 2 | Validate LLM false positive rate benchmarks | DSPy prompt patterns; FP measurement methodology |
| Phase 3 | Deep research on attack chain reconstruction | MITRE ATT&CK mapping patterns; graph algorithms |
| Phase 4 | Evaluate operational monitoring approaches | Standard SRE practices for logging systems |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | MEDIUM | Based on training data; web search restricted. Technology choices are battle-tested but verification needed. |
| **Features** | MEDIUM-HIGH | Based on existing project research + domain knowledge. MVP phasing is well-reasoned. |
| **Architecture** | LOW-MEDIUM | Standard SIEM patterns, but specific decisions (Elasticsearch vs alternatives) need validation. |
| **Pitfalls** | LOW | Training data only; web search unavailable. Recommendations based on general security knowledge. |

### Gaps to Address

1. **WebSearch verification unavailable** - All research based on training data through ~2024-2025. When WebSearch becomes available, verify:
   - Current SIEM market best practices
   - LLM-based security analysis benchmarks
   - Drain algorithm implementation at scale

2. **Competitive landscape** - Need actual product comparison (Splunk vs Sentinel vs QRadar vs Darktrace)

3. **User research validation** - Confirm non-expert IT ops needs match assumptions

4. **Tech stack decisions pending**:
   - LangChain vs direct API (depending on chain complexity)
   - PostgreSQL vs TimescaleDB (depending on query performance)
   - Vector vs Fluentd (benchmark needed)

---

## Sources

Aggregated from 4 parallel research outputs:
- `.planning/research/STACK.md` (MEDIUM confidence)
- `.planning/research/FEATURES.md` (MEDIUM-HIGH confidence)
- `.planning/research/ARCHITECTURE.md` (LOW-MEDIUM confidence)
- `.planning/research/PITFALLS.md` (LOW confidence)

All confidence levels reduced due to WebSearch unavailability during research phase. Recommend verification via web search and industry documentation (Gartner, MITRE ATT&CK, Elastic, Splunk) before finalizing architecture and stack decisions.
