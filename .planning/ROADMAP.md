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
- 🚧 **v1.6** — 从 Elasticsearch 接入数据渠道 (Phase 17)

---

## Current State

**v1.6 进行中** — 增加从 Elasticsearch 接入安全日志数据的渠道

### Phase 17: ES 数据渠道接入

**Goal:** 增加从 Elasticsearch 中接入安全日志数据的渠道
**Requirements**: ES-01, ES-02, ES-03, ES-04
**Depends on:** Phase 16
**Plans:** 3/3 plans created

Plans:
- [x] 17-01-PLAN.md — Logstash Docker 服务配置完成 (ES-01, ES-02)
- [ ] 17-02-PLAN.md — ES 日志拉取与解析接入 (ES-03)
- [ ] 17-03-PLAN.md — ES 告警数据采集流程 + E2E 验证 (ES-04)

---

## Archived Milestones

- [v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md) — Phases 1-4
- [v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — Phases 5-8
- [v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) — Phases 9-12
- [v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) — Phase 13
- [v1.4-ROADMAP.md](./milestones/v1.4-ROADMAP.md) — Phases 14-15
- [v1.5-ROADMAP.md](./milestones/v1.5-ROADMAP.md) — Phase 16
- [v1.5-ROADMAP.md](./milestones/v1.5-ROADMAP.md) — Phases 16
