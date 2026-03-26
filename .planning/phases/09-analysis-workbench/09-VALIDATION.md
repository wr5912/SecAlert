---
phase: 9
slug: analysis-workbench
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (已在项目中配置) |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | 路由配置 (D-01) | unit | `npm run test -- --run` | ✅ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | StorylineCard 组件 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | StorylineList 组件 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | AttackGraph React Flow | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 1 | 图数据 API 集成 | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 1 | Timeline 多轨道组件 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-04-01 | 04 | 2 | Zustand analysisStore | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-04-02 | 04 | 2 | AI Copilot 上下文感知 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-05-01 | 05 | 2 | 资产上下文面板 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 9-06-01 | 06 | 2 | 威胁狩猎查询构建器 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/stores/analysisStore.ts` — Zustand 全局分析上下文 store
- [ ] `frontend/src/components/analysis/StorylineCard.tsx` — 故事线卡片组件
- [ ] `frontend/src/components/analysis/StorylineList.tsx` — 故事线列表组件
- [ ] `frontend/src/components/analysis/AttackGraph.tsx` — React Flow 攻击图组件
- [ ] `frontend/src/components/analysis/Timeline.tsx` — 多轨道时间线组件
- [ ] `frontend/src/components/analysis/NavSidebar.tsx` — 侧边导航组件
- [ ] `frontend/src/components/analysis/AIPanel.tsx` — AI Copilot 面板组件
- [ ] `frontend/src/components/analysis/ContextPanel.tsx` — 资产上下文面板
- [ ] `frontend/src/components/analysis/HuntingWorkbench.tsx` — 威胁狩猎工作台
- [ ] `frontend/tests/analysis/` — Vitest 测试目录和基础测试文件

*Existing infrastructure: Vitest 已配置，shadcn 组件可用。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 攻击链路图交互 (拖拽/缩放) | D-04 React Flow | 需要浏览器交互验证 | 手动测试节点拖拽、缩放、选择操作 |
| 时间轴拖拽 | D-06 范围滑块 | 需要浏览器交互验证 | 手动测试滑块拖拽和时间范围更新 |
| 侧边栏折叠 (<1200px) | D-02 混合折叠 | 视口相关 | 手动测试不同视口宽度下的折叠行为 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
