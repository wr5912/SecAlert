# SecAlert Roadmap

**Project:** Security Alert Analysis System
**Granularity:** Standard
**Created:** 2026-03-22
**Updated:** 2026-04-03

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-25)
- ✅ **v1.1** — 多数据源支持 + 产品级 UI + AI 助手 (shipped 2026-03-25)
- ✅ **v1.2** — 智能分析工作台 (shipped 2026-03-30)
- ✅ **v1.3** — Claude Code AI 后端 (shipped 2026-04-01)
- ✅ **v1.4** — 数据接入前端界面 (shipped 2026-04-02)
- ✅ **v1.5** — 数据接入功能完善 + 全局元数据 (shipped 2026-04-03)
- ✅ **v1.6** — 从 Elasticsearch 接入数据渠道 (Phase 17 ✅)
- ✅ **v1.6 续** — 多源异构数据模拟器 + 死信队列 + 可观测性监控 (Phase 18-19 ✅)
- 🚧 **v1.7** — Phase 20: v1.6 收尾与集成测试

---

## Current State

**v1.7 启动中** — Phase 20: v1.6 收尾与集成测试

### Phase 20: v1.6 收尾与集成测试

**Goal:** 完成 v1.6 所有功能的集成测试
**Depends on:** Phase 19
**Plans:** Not started

---

### Phase 18: 多源异构数据模拟器

**Goal:** 创建独立测试环境，模拟各种安全设备数据上报渠道
**Depends on:** Phase 17
**Plans:** 1/2 plans

Plans:
- [x] 18-01-PLAN.md — 多源异构数据模拟器基础设施 ✅ Complete
- [x] 18-02-PLAN.md — DLQ 死信队列机制实现 (SM-01) ✅ Complete

---

### Phase 19: 采集可观测性监控

**Goal:** 采集系统监控指标
**Depends on:** Phase 18
**Requirements**: SM-02
**Plans:** 1/1 plans
- [x] 19-01-PLAN.md — 采集可观测性监控实现 ✅ Complete

---

## Archived Milestones

- [v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md) — Phases 1-4
- [v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — Phases 5-8
- [v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) — Phases 9-12
- [v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) — Phase 13
- [v1.4-ROADMAP.md](./milestones/v1.4-ROADMAP.md) — Phases 14-15
- [v1.5-ROADMAP.md](./milestones/v1.5-ROADMAP.md) — Phase 16
- [v1.5-ROADMAP.md](./milestones/v1.5-ROADMAP.md) — Phases 16
