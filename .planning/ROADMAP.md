# SecAlert Roadmap

**Project:** Security Alert Analysis System
**Granularity:** Standard
**Created:** 2026-03-22

---

## Phases

- [ ] **Phase 1: Foundation & Ingestion** - Technical infrastructure and log ingestion pipeline
- [x] **Phase 2: Attack Chain Correlation** - Cross-device correlation and attack chain reconstruction (completed 2026-03-23)
- [ ] **Phase 3: Core Analysis Engine** - AI-powered false positive filtering and attack detection
- [ ] **Phase 4: Recommendations & Polish** - Remediation guidance and operator UI refinement

---

## Phase Details

### Phase 1: Foundation & Ingestion

**Goal:** System can ingest, parse, and store security alerts from heterogeneous devices

**Depends on:** None (first phase)

**Requirements:** PARSE-01, INFRA-01, INFRA-02, INFRA-03

**Success Criteria** (what must be TRUE):
1. Vector agent can receive logs from at least one security device type (firewall, IDS, or similar)
2. Logs flow through Kafka message queue without loss under normal load
3. Three-tier parser processes logs: template matching, then Drain clustering, then LLM inference for unknown formats
4. Parsed alerts are stored in PostgreSQL with searchable fields
5. Redis caches deduplication state and reduces duplicate alert processing

**Plans:** 5/5 plans executed

Plans:
- [x] 01-01-PLAN.md — Docker Compose Dev Environment (COMPLETE)
- [x] 01-02-PLAN.md — Vector Syslog to Kafka Pipeline
- [x] 01-03-PLAN.md — Three-Tier Parser (Template, Drain, DSPy)
- [x] 01-04-PLAN.md — PostgreSQL Storage + Redis Deduplication
- [x] 01-05-PLAN.md — Qwen3-32B Test Data Generator

---

### Phase 2: Attack Chain Correlation

**Goal:** System groups related alerts across time and devices into coherent attack narratives

**Depends on:** Phase 1

**Requirements:** CHAIN-01

**Success Criteria** (what must be TRUE):
1. Related alerts are correlated by shared indicators (source IP, target asset, attack pattern)
2. Attack chains are reconstructed as timeline visualizations showing progression
3. Each chain is linked to relevant MITRE ATT&CK techniques when applicable
4. Operator can view attack chain detail with all correlated alerts and chain metadata

**Plans:** 4/4 plans complete

Plans:
- [x] 02-01-PLAN.md — Test Infrastructure & ATT&CK Rules
- [x] 02-02-PLAN.md — ATT&CK Mapper (Rule + LLM Fallback)
- [x] 02-03-PLAN.md — Alert Correlator Engine (Dynamic Window + Rules)
- [x] 02-04-PLAN.md — Attack Chain Storage & API

---

### Phase 3: Core Analysis Engine

**Goal:** System automatically filters false positives and identifies real attacks

**Depends on:** Phase 2

**Requirements:** FILTER-01, DETECT-01

**Success Criteria** (what must be TRUE):
1. AI model classifies incoming alerts as false positive or real threat with documented confidence score
2. False positives are automatically suppressed and logged for review
3. Real attacks are flagged with severity level (Critical, High, Medium, Low)
4. Operator can view list of auto-dismissed false positives and restore any that were incorrectly filtered
5. System measures and displays false positive rate (target <30%)

**Plans:** 3/3 plans created

Plans:
- [ ] 03-01-PLAN.md — DSPy Classifier & Severity Scoring (Wave 1)
- [ ] 03-02-PLAN.md — AnalysisService & Metrics (Wave 2)
- [ ] 03-03-PLAN.md — REST API & Unit Tests (Wave 3)

---

### Phase 4: Recommendations & Polish

**Goal:** Non-expert operators receive clear, actionable guidance for each real attack

**Depends on:** Phase 3

**Requirements:** REMED-01, UI-01

**Success Criteria** (what must be TRUE):
1. Each real attack generates plain-language remediation recommendation
2. Recommendations reference specific affected assets (not generic advice)
3. Alert triage UI displays only Critical and High severity alerts by default
4. UI shows attack chain summary and recommended action on single screen
5. Non-expert operator can complete full incident response workflow without security expertise

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Ingestion | 5/5 | Complete | 2026-03-23 |
| 2. Attack Chain Correlation | 4/4 | Complete   | 2026-03-23 |
| 3. Core Analysis Engine | 0/3 | Not started | - |
| 4. Recommendations & Polish | 0/5 | Not started | - |

---

## Requirement Coverage

| Requirement | ID | Phase |
|-------------|-----|-------|
| 系统能自动识别和解析未知格式的安全设备日志 | PARSE-01 | Phase 1 |
| 系统能还原攻击链，呈现完整的攻击路径 | CHAIN-01 | Phase 2 |
| 系统能自动过滤误报，直接忽略 | FILTER-01 | Phase 3 |
| 系统能检测真实攻击并报警 | DETECT-01 | Phase 3 |
| 系统能给出简单明确的处置建议 | REMED-01 | Phase 4 |
| 界面简洁，面向非专业运维人员 | UI-01 | Phase 4 |

**Coverage:** 6/6 requirements mapped

---

## Dependencies

```
Phase 1 (Foundation & Ingestion)
    ↓
Phase 2 (Attack Chain Correlation)
    ↓
Phase 3 (Core Analysis Engine)
    ↓
Phase 4 (Recommendations & Polish)
```
