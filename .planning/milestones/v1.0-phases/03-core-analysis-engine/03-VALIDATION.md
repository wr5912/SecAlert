---
phase: 3
slug: core-analysis-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest >= 7.4.0 |
| **Config file** | pyproject.toml [tool.pytest.ini_options] |
| **Quick run command** | `pytest tests/test_analysis/ -x -q` |
| **Full suite command** | `pytest tests/ -q` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** `pytest tests/test_analysis/ -x -q`
- **After every plan wave:** `pytest tests/ -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FILTER-01 | unit | `pytest tests/test_analysis/test_classifier.py::test_suppression_threshold -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FILTER-01 | unit | `pytest tests/test_analysis/test_classifier.py::test_false_positive_restore -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | DETECT-01 | unit | `pytest tests/test_analysis/test_severity.py::test_severity_scoring -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | FILTER-01 | unit | `pytest tests/test_analysis/test_metrics.py::test_fp_rate_calculation -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_analysis/__init__.py` — test package init
- [ ] `tests/test_analysis/conftest.py` — fixtures for mock chains, classification results
- [ ] `tests/test_analysis/test_classifier.py` — classifier unit tests (suppression_threshold, false_positive_restore)
- [ ] `tests/test_analysis/test_severity.py` — severity scoring tests (severity_scoring)
- [ ] `tests/test_analysis/test_metrics.py` — false positive rate metrics tests (fp_rate_calculation)
- [ ] `src/analysis/__init__.py` — analysis package init
- [ ] `src/analysis/classifier/__init__.py` — classifier package init
- [ ] `src/analysis/classifier/signatures.py` — FalsePositiveClassifierSignature stub
- [ ] `src/analysis/classifier/programs.py` — ChainClassifierProgram stub
- [ ] `src/analysis/classifier/rules.py` — pre-built classification rules stub
- [ ] `src/analysis/classifier/severity.py` — severity scoring stub
- [ ] `src/analysis/service.py` — AnalysisService stub
- [ ] `src/analysis/metrics.py` — FalsePositiveMetrics stub

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 严重度四级分级实际效果 | DETECT-01 | 需要人工判断严重度是否合理 | 提供 test chain fixture，运行分类，对照 ATT&CK 基准验证 |
| 误报恢复操作可用性 | FILTER-01 | Phase 4 UI 阶段才完整 | 调用 `/api/chains/{id}/restore` 端点，验证状态变更 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
