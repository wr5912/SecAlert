# SecAlert Roadmap

**Project:** Security Alert Analysis System
**Granularity:** Standard
**Created:** 2026-03-22
**Updated:** 2026-04-02

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-25)
- ✅ **v1.1** — 多数据源支持 + 产品级 UI + AI 助手 (shipped 2026-03-25)
- ✅ **v1.2** — 智能分析工作台 (shipped 2026-03-30)
- ✅ **v1.3** — Claude Code AI 后端 (shipped 2026-04-01)

---

## Current State

**Shipped v1.3** — Claude Code AI 后端已完成，包含 claude-agent-sdk 集成、WebSocket 流式对话、自定义安全工具和 21 个集成测试。

---

### Phase 14: 数据接入前端界面

**Goal:** 为 IT 运维人员提供直观的数据接入配置界面，简化新安全设备的接入流程
**Requirements**: DI-01, DI-02, DI-03, DI-04, DI-05, DI-06
**Depends on:** Phase 13
**Plans:** 3/3 plans complete

Plans:
- [x] 14-00-PLAN.md — Wave 0: 测试基础设施
- [x] 14-01-PLAN.md — Wave 1: 后端 API + 模板 CRUD (DI-01~04)
- [x] 14-02-PLAN.md — Wave 2: 前端向导 UI + 组件 (DI-05~06)

### Phase 15: 数据接入用户体验增强

**Goal:** 实现 AI 自动识别、可视化字段映射、批量接入、解析测试功能
**Requirements**: DI-07, DI-08, DI-09
**Depends on:** Phase 14
**Plans:** 9/9 plans complete

**Plans (Original):**
- [x] 15-01-PLAN.md — Wave 1: AI 自动识别 (DI-07)
- [x] 15-02-PLAN.md — Wave 1: 可视化字段映射
- [x] 15-03-PLAN.md — Wave 2: 批量接入 (DI-08)
- [x] 15-04-PLAN.md — Wave 2: 解析测试 (DI-09)
- [x] 15-05-PLAN.md — Gap closure: AI 识别 + MappingPreview 修复
- [x] 15-06-PLAN.md — Gap closure: REQUIREMENTS.md 条目补充

**Gap Closure Plans (Reviews Mode):**
- [x] 15-07-PLAN.md — Wave 1: 统一 field_mappings 方向 + detected_fields + templateId race condition
- [x] 15-08-PLAN.md — Wave 2: preview-parse 端点完善 + 批量导入错误处理 + Step 数据流
- [x] 15-09-PLAN.md — Wave 2: WizardModal 状态管理策略 + 验证脚本修复
- [x] 15-10-PLAN.md — Gap closure: WizardModal Step5 跳过按钮 + canGoNext + WIZARD_STEPS

---

## Archived Milestones

- [v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md) — Phases 1-4
- [v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — Phases 5-8
- [v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) — Phases 9-12
- [v1.3-ROADMAP.md](./milestones/v1.3-ROADMAP.md) — Phase 13
