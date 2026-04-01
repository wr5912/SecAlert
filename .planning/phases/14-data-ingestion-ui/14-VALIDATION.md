---
phase: 14
slug: data-ingestion-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (Python backend), Vitest (optional frontend) |
| **Config file** | tests/conftest.py (existing) |
| **Quick run command** | `pytest tests/test_ingestion/ -x` |
| **Full suite command** | `pytest tests/ -v` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_ingestion/ -x`
- **After every plan wave:** Run `pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DS-01 | unit | `pytest tests/test_ingestion/ -k test_create_template` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | DS-02 | unit | `pytest tests/test_ingestion/ -k test_update_template` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | DS-03 | unit | `pytest tests/test_ingestion/ -k test_delete_template` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | DS-04 | unit | `pytest tests/test_ingestion/ -k test_list_templates` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | DS-05 | unit | `pytest tests/test_ingestion/ -k test_wizard_step` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | DS-06 | unit | `pytest tests/test_ingestion/ -k test_component` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_ingestion/__init__.py` — 测试目录初始化
- [ ] `tests/test_ingestion/conftest.py` — 共享 fixtures
- [ ] `tests/test_ingestion/test_templates.py` — 模板 CRUD API 测试
- [ ] `tests/test_ingestion/test_wizard.py` — 向导状态测试
- [ ] Framework install: `pip install pytest pytest-asyncio` (如未安装)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 向导视觉效果 | DS-05 | 需要视觉确认 | 在浏览器中运行前端，执行完整的4步骤向导流程 |
| 模板管理页面布局 | DS-06 | UI 布局需要人眼确认 | 访问 /ingestion/templates 检查卡片布局 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
