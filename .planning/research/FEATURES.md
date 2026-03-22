# Feature Landscape

**Domain:** Security Alert Analysis / SIEM
**Researched:** 2026-03-22
**Confidence:** MEDIUM-HIGH (based on existing project research + domain knowledge; WebSearch unavailable for verification)

---

## Table of Contents

1. [Table Stakes (Expected)](#table-stakes)
2. [Differentiators](#differentiators)
3. [Anti-Features](#anti-features)
4. [Feature Dependencies](#feature-dependencies)
5. [MVP Recommendation](#mvp-recommendation)
6. [Sources](#sources)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | SecAlert Status |
|---------|--------------|-------------|------------------|
| **Log Ingestion** | Cannot analyze without data | Medium | Planned (Vector) |
| **Log Parsing/Normalization** |异构日志 must become structured data | High | Planned (3-tier parsing) |
| **Alert Storage & Search** | Need to query historical alerts | Medium | Planned (Elasticsearch) |
| **Basic Alert Filtering** | Reduce noise before analysis | Low | Planned |
| **User Authentication** | Enterprise security requirement | Low | Out of scope (infra) |
| **Role-Based Access** | Different personas (ops vs sec) | Low | Out of scope (infra) |
| **Alert Triage UI** | Non-expert must understand alerts | Medium | Planned |
| **Severity/Priority Levels** | Classify alert importance | Low | Planned |
| **Time-Based Filtering** | Query by time range | Low | Planned |
| **Source/Device Filtering** | Filter by firewall, IDS, etc. | Low | Planned |

### Detailed Table Stakes Analysis

#### 1. Log Ingestion (Medium Complexity)

**What:** Collect logs from heterogeneous security devices (firewalls, IDS, endpoint, cloud security).

**Why expected:** Security analysis requires data. Without ingestion, nothing to analyze. Different devices output different formats.

**SecAlert approach:** Vector unified collection framework with adapters for JDBC, REST, file, syslog.

#### 2. Log Parsing/Normalization (High Complexity)

**What:** Convert unknown log formats into standardized structure (OCSF/ECS/CEF).

**Why expected:** 异构数据 sources = heterogeneous formats. Analysis layer needs unified format.

**SecAlert approach:** Three-tier parsing (template -> Drain -> DSPy/LLM). This is core to addressing the unknown format challenge.

#### 3. Alert Storage & Search (Medium Complexity)

**What:** Store parsed alerts, support full-text search, time-range queries, faceted filtering.

**Why expected:** Cannot investigate without historical context. Need to search and pivot.

**SecAlert approach:** Elasticsearch for search and retrieval, ClickHouse for OLAP.

#### 4. Basic Alert Filtering (Low Complexity)

**What:** Allow users to filter alerts by severity, source, time, type.

**Why expected:** First line of defense against alert fatigue. Users expect to narrow focus.

#### 5. Severity/Priority Levels (Low Complexity)

**What:** Classify alerts as Critical, High, Medium, Low, Info.

**Why expected:** Universal security concept. Allows prioritization.

#### 6. Alert Triage UI (Medium Complexity)

**What:** Interface showing alert details in human-readable format.

**Why expected:** Non-expert users cannot parse raw logs. Need translation.

---

## Differentiators

Features that set products apart. Not expected universally, but highly valued when present.

| Feature | Value Proposition | Complexity | SecAlert Status |
|---------|-------------------|------------|------------------|
| **False Positive Auto-Ignoring** | 30k+ alerts/day -> only real threats shown | Very High | Core value prop |
| **Attack Chain Reconstruction** | See complete attack path, not isolated events | High | Core value prop |
| **AI-Powered Analysis** | LLM understands context, reduces manual work | Very High | Core (Qwen3-32B) |
| **Unknown Format Auto-Adaptation** | Zero-configuration for new devices | Very High | Core (DSPy) |
| **Simple Recommendation Generation** | Non-expert knows what to do next | High | Core value prop |
| **Cross-Device Correlation** | Correlate firewall + IDS + EDR events | High | Planned |
| **Risk Scoring** | Multi-factor scoring beyond severity | Medium | Planned |
| **ATT&CK Framework Mapping** | Align alerts with MITRE ATT&CK | Medium | Planned |
| **Threat Intelligence Integration** | Match against known malicious IOCs | Medium | Partial (out of scope external TI) |

### Detailed Differentiators Analysis

#### 1. False Positive Auto-Ignoring (Very High Complexity)

**What:** Automatically determine which alerts are false positives and suppress them without user action.

**Value proposition:**
- 30k+ alerts/day is unmanageable for non-experts
- Manual FP identification is time-consuming and requires expertise
- Auto-ignore = core SecAlert value proposition

**Technical challenges:**
- Requires learning from user feedback
- Must balance recall vs precision (don't miss real attacks)
- Different device types have different FP rates
- Context from multiple alerts may be needed to determine FP

**SecAlert approach:** DSPy + Qwen3-32B for AI-driven classification. Three-tier parsing provides context for better decisions.

#### 2. Attack Chain Reconstruction (High Complexity)

**What:** Group related alerts across time and devices into a coherent attack narrative.

**Value proposition:**
- Single alerts are meaningless without context
- Attack chains show the full kill chain (reconnaissance -> initial access -> lateral movement -> data exfiltration)
- Non-experts see "this is attack #1, #2, #3 in a sequence"

**Technical challenges:**
- Entity alignment across different device logs (same IP, different representations)
- Temporal ordering across devices with clock skew
- Causal vs correlational relationships
- Unknown attack patterns

**SecAlert approach:** Entity relationship graph (Neo4j), temporal session aggregation, ATT&CK tactical mapping.

#### 3. AI-Powered Analysis (Very High Complexity)

**What:** Use LLM to understand alert context, generate narratives, classify alerts, suggest actions.

**Value proposition:**
- Natural language output for non-experts
- Context-aware classification (not just rule matching)
- Can handle novel attack patterns
- Reduces need for pre-defined rules

**Technical challenges:**
- Offline deployment (no external API)
- Latency constraints (30k+ alerts/day)
- Hallucination risk
- Cost of LLM inference

**SecAlert approach:** Privately deployed Qwen3-32B via vLLM, DSPy framework for structured outputs.

#### 4. Unknown Format Auto-Adaptation (Very High Complexity)

**What:** Parse and understand log formats without pre-existing templates.

**Value proposition:**
- System must work with 异构安全设备 without manual configuration
- Zero-configuration = faster deployment, less expert involvement
- Competitive advantage over SIEMs requiring extensive onboarding

**Technical challenges:**
- Zero-shot log parsing is hard
- Must balance accuracy vs coverage
- Schema drift over time

**SecAlert approach:** DSPy + Qwen3-32B for LLM-driven parsing, with feedback loop for self-iteration.

#### 5. Simple Recommendation Generation (High Complexity)

**What:** For each confirmed true positive, generate clear remediation steps in plain language.

**Value proposition:**
- Non-expert user doesn't know security best practices
- Reduces time-to-response
- Enables junior staff to handle security incidents

**Technical challenges:**
- Recommendations must be accurate and safe
- Context-dependent (same alert, different assets = different remediation)
- Must avoid harmful suggestions

**SecAlert approach:** DSPy-driven generation with security knowledge base.

#### 6. Cross-Device Correlation (High Complexity)

**What:** Link alerts from different security devices into unified incidents.

**Example:** Firewall blocked port scan + IDS detected exploit + EDR found malicious process -> same incident.

**Value proposition:**
- Single device view is incomplete
- Correlation reveals attacker's full behavior
- Reduces duplicate alerts

**SecAlert approach:** Entity alignment via IP/username/timestamp, Flink stream processing for real-time correlation.

#### 7. Risk Scoring (Medium Complexity)

**What:** Compute risk score combining multiple factors (severity, asset criticality, threat intel, user context).

**Value proposition:**
- Not all critical severity alerts are equally risky
- Asset context matters (domain controller vs. test server)
- Helps prioritize response

**SecAlert approach:** Enrichment layer with asset info + threat intel + ATT&CK mapping.

#### 8. ATT&CK Framework Mapping (Medium Complexity)

**What:** Map detected alerts/behaviors to MITRE ATT&CK tactics and techniques.

**Value proposition:**
- Standard vocabulary for security community
- Helps analysts understand attack stage
- Supports threat hunting

**SecAlert approach:** Enrichment layer maps events to ATT&CK tactical sequence.

#### 9. Threat Intelligence Integration (Medium Complexity)

**What:** Match alerts against known malicious IOCs (IP, domain, hash, URL).

**Value proposition:**
- Quick identification of known threats
- External threat intel is industry standard
- High confidence alerts when IOC matches

**SecAlert constraint:** Private offline deployment limits external TI feeds. Need internal/private TI.

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Automatic Blocking/Response** | Too risky for non-expert users; may cause business disruption | Alert only, human decides |
| **Professional Security Analyst Tools** | Target user is non-expert IT ops, not sec experts | Simple UI, plain language |
| **Real-Time Blocking/Prevention** | Analysis tool定位, not firewall replacement | Focus on detection and alerting |
| **Custom Rule Authoring UI** | Requires security expertise | Pre-built rules + AI-driven analysis |
| **Full SIEM Feature Parity** | Over-engineering for target users | Focus on core value prop |
| **External Cloud Dependencies** | Private deployment requirement | All inference via private Qwen3-32B |
| **Multi-Tenant SaaS** | Enterprise on-prem requirement | Single-tenant private deployment |

---

## Feature Dependencies

```
Log Ingestion (Vector)
    ↓
Log Parsing/Normalization (3-tier)
    ↓
Alert Storage (Elasticsearch) ← Alert Triage UI
    ↓                    ↑
Alert Filtering ← User Feedback Loop (for FP learning)
    ↓
Cross-Device Correlation (Flink)
    ↓
Attack Chain Reconstruction (Neo4j)
    ↓
Risk Scoring + ATT&CK Mapping (Enrichment)
    ↓
Simple Recommendations (LLM)
    ↓
Alert Triage UI (Presentation)
```

### Critical Path for SecAlert MVP

1. **Log Ingestion** must work first
2. **Log Parsing** enables everything else
3. **Basic Alert Storage/Search** is prerequisite for UI
4. **AI Analysis (DSPy + Qwen)** provides core differentiation
5. **False Positive Filtering** is the core value proposition
6. **Attack Chain Reconstruction** differentiates from basic SIEM
7. **Simple Recommendations** completes the non-expert UX

---

## MVP Recommendation

### Phase 1: Core Foundation

Prioritize table stakes that enable core value prop:

1. **Log Ingestion via Vector** - Cannot analyze without data
2. **Log Parsing (at least 1 tier: DSPy/LLM)** - Must handle unknown formats
3. **Basic Alert Storage & Search** - Elasticsearch
4. **Basic Alert Triage UI** - Simple list/detail view
5. **Severity Classification** - Critical/High/Medium/Low

### Phase 2: Core Value

Prioritize differentiators that deliver core promise:

1. **False Positive Auto-Ignoring** - Filter 30k+ to manageable set
2. **AI-Powered Alert Analysis** - Context understanding via Qwen3-32B
3. **Simple Recommendations** - Plain language remediation
4. **Cross-Device Correlation** - Link related alerts

### Phase 3: Advanced

Enhancements for more complete coverage:

1. **Attack Chain Reconstruction** - Visual kill chain
2. **ATT&CK Mapping** - Tactical context
3. **Risk Scoring** - Multi-factor prioritization
4. **Threat Intelligence** - Internal IOC matching
5. **Advanced Filtering/Pivot** - Investigation tools

### Feature Deferral

| Feature | Reason to Defer |
|---------|-----------------|
| Threat Hunting | Requires expert users |
| SOAR Automation | Anti-feature for non-experts |
| Custom Rule Authoring | Requires security expertise |
| Real-Time Blocking | Anti-feature per requirements |
| Multi-Cloud Posture | Not in scope |
| Compliance Reporting | Can add later |

---

## Sources

**Confidence: MEDIUM** (WebSearch unavailable during research; based on existing project research and domain knowledge)

### Primary Research
- Project internal research: `docs/项目调研材料.md` (extensive SIEM analysis)
- Existing architecture: `.planning/codebase/ARCHITECTURE.md`
- Existing stack: `.planning/codebase/STACK.md`

### Industry Knowledge (Verification Recommended)
- Splunk Enterprise Security (SIEM market leader)
- Microsoft Sentinel (cloud SIEM)
- IBM QRadar (enterprise SIEM)
- Palo Alto XSIAM (AI-driven SOC)
- Elastic Security (open source SIEM)
- Darktrace (AI-native security)

### Recommended Verification Sources (when WebSearch available)
- Gartner Magic Quadrant for SIEM
- Forrester Wave for SIEM
- MITRE ATT&CK Framework documentation
- OCSF (Open Cybersecurity Schema Framework) documentation

---

## Gaps to Address

1. **Competitive feature comparison** - Need actual SIEM product comparison (Splunk vs Sentinel vs QRadar)
2. **User research validation** - Confirm non-expert IT ops actually need what we think
3. **Market timing** - AI-native SOC products are emerging rapidly (Darktrace, Palo Alto XSIAM)
4. **Pricing benchmarks** - Enterprise security budget constraints unknown
