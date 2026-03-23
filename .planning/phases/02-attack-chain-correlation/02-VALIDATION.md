---
phase: 02
slug: attack-chain-correlation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-23
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (Python standard) |
| **Config file** | pytest.ini 或 pyproject.toml (继承自 Phase 1) |
| **Quick run command** | `pytest tests/test_chain/ -x -v` |
| **Full suite command** | `pytest tests/ --tb=short` |
| **Estimated runtime** | ~30-60 秒 |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_chain/ -x`
- **After every plan wave:** Run `pytest tests/ --tb=short`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 秒

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | CHAIN-01 | unit | `pytest tests/test_chain/test_correlator.py -x` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | CHAIN-01 | unit | `pytest tests/test_chain/test_attck_mapper.py -x` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | CHAIN-01 | unit | `pytest tests/test_chain/test_chain_reconstruction.py -x` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | CHAIN-01 | integration | `pytest tests/test_chain/test_chain_api.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_chain/` 目录 — Phase 2 测试目录
- [ ] `tests/test_chain/test_correlator.py` — 关联逻辑单元测试
- [ ] `tests/test_chain/test_attck_mapper.py` — ATT&CK 映射单元测试
- [ ] `tests/test_chain/test_chain_reconstruction.py` — 攻击链构建单元测试
- [ ] `tests/test_chain/test_chain_api.py` — 攻击链 API 集成测试
- [ ] `tests/conftest.py` — 共享 fixtures (Neo4j 测试客户端、mock alerts)
- [ ] `rules/attck_suricata.yaml` — Suricata 签名 → ATT&CK 预置映射规则

*Wave 0 由各 Plan 的首个任务创建测试骨架和 fixtures。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 攻击链时间线可视化渲染 | CHAIN-01 | 前端 UI 组件，需人工确认 | 在 DevTools 中检查 Neo4j 数据正确写入后，通过 API 获取攻击链 JSON，目视确认时间线和 ATT&CK 标签 |
| 动态窗口阈值调优 | CHAIN-01 | 需真实告警流量数据验证 | 使用 Phase 1 输出的 Suricata 告警样本，回放并检查 chain fragmentation 指标 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-23
