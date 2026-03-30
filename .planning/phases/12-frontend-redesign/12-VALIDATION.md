---
phase: 12
slug: frontend-redesign
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-30
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vite + React + TypeScript |
| **Config file** | frontend/vite.config.ts, frontend/tsconfig.json |
| **Quick run command** | `cd frontend && npm run build` |
| **Full suite command** | `cd frontend && npm run build && npm run typecheck` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run build`
- **After every plan wave:** Run `cd frontend && npm run build && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | UI-12-01 | build | `grep -q "@fontsource-variable/jetbrains-mono" frontend/package.json` | N/A | pending |
| 12-01-02 | 01 | 1 | UI-12-02 | build | `grep -q "var(--background)" frontend/src/index.css` | N/A | pending |
| 12-01-03 | 01 | 1 | UI-12-02 | build | `grep -q "fontFamily" frontend/tailwind.config.js` | N/A | pending |
| 12-01-04 | 01 | 1 | UI-12-01 | build | `grep -q "@fontsource-variable" frontend/src/main.tsx` | N/A | pending |
| 12-01-05 | 01 | 1 | UI-12-03 | build | `test -f frontend/src/components/GridBackground.tsx` | N/A | pending |
| 12-01-06 | 01 | 1 | UI-12-03 | manual | See checkpoint instructions | N/A | pending |
| 12-01-07 | 01 | 1 | UI-12-03 | build | `grep -q "severity-critical" frontend/src/components/ui/Badge.tsx` | N/A | pending |
| 12-01-08 | 01 | 1 | UI-12-03 | build | `grep -q "GlowCard" frontend/src/components/dashboard/StatCard.tsx` | N/A | pending |
| 12-02-01 | 02 | 2 | UI-12-04 | build | `grep -q "bg-surface" frontend/src/components/ui/Card.tsx` | N/A | pending |
| 12-02-02 | 02 | 2 | UI-12-04 | build | `grep -q "bg-accent" frontend/src/components/ui/button.tsx` | N/A | pending |
| 12-02-03 | 02 | 2 | UI-12-04 | build | `grep -q "animate-fade-in-up" frontend/src/components/AlertList.tsx` | N/A | pending |
| 12-02-04 | 02 | 2 | UI-12-04 | build | `grep -q "font-heading" frontend/src/components/layout/Header.tsx` | N/A | pending |
| 12-02-05 | 02 | 2 | UI-12-04 | build | `grep -q "focus-visible:ring-accent" frontend/src/components/ui/input.tsx` | N/A | pending |
| 12-02-06 | 02 | 2 | UI-12-04 | build | `grep -q "bg-surface" frontend/src/components/ui/dialog.tsx` | N/A | pending |
| 12-02-07 | 02 | 2 | UI-12-04 | manual | See checkpoint instructions | N/A | pending |
| 12-02-08 | 02 | 2 | UI-12-05 | build | `grep -q "severity-critical" frontend/src/components/dashboard/AlertTrendChart.tsx` | N/A | pending |
| 12-02-09 | 02 | 2 | UI-12-05 | build | `grep -q "bg-accent" frontend/src/components/analysis/AIPanel.tsx` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Vite project initialized in frontend/
- [ ] Tailwind CSS configured
- [ ] TypeScript configured

*Existing infrastructure covers all phase requirements — no Wave 0 stubs needed for frontend-only visual changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 网格背景可见 | UI-12-03 | 视觉效果需人眼确认 | 访问 http://localhost:5173，检查页面有 40px 网格线条 |
| 噪点纹理可见 | UI-12-03 | 视觉效果需人眼确认 | 检查页面有细微噪点纹理覆盖 |
| GlowCard 发光效果 | UI-12-03 | 视觉效果需人眼确认 | 检查 StatCard 有 severity 对应的 glow 效果 |
| Header 战术风格 | UI-12-04 | 视觉效果需人眼确认 | 检查 Header 有渐变边框和 accent 高亮 |
| 告警列表动画 | UI-12-04 | 视觉效果需人眼确认 | 检查告警行有交错淡入动画 |

*All automated verifications use `grep` pattern matching on file contents.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
