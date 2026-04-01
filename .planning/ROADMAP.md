# SecAlert Roadmap

**Project:** Security Alert Analysis System
**Granularity:** Standard
**Created:** 2026-03-22
**Updated:** 2026-04-01

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-25)
- ✅ **v1.1** — 多数据源支持 + 产品级 UI + AI 助手 (shipped 2026-03-25)
- ✅ **v1.2** — 智能分析工作台 (shipped 2026-03-30)
- 🚧 **v1.3** — Claude Code AI 后端 (in progress)

---

## Phases

- [ ] **Phase 13: Claude Code AI 后端** — claude-agent-sdk 集成、WebSocket 流式对话、自定义安全工具

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Ingestion | v1.0 | 5/5 | Complete | 2026-03-23 |
| 2. Attack Chain Correlation | v1.0 | 4/4 | Complete | 2026-03-23 |
| 3. Core Analysis Engine | v1.0 | 3/3 | Complete | 2026-03-24 |
| 4. Recommendations & Polish | v1.0 | 3/3 | Complete | 2026-03-24 |
| 5. 多数据源支持 | v1.1 | 1/1 | Complete | 2026-03-25 |
| 6. 产品级 UI | v1.1 | 1/1 | Complete | 2026-03-25 |
| 7. AI 助手 | v1.1 | 2/2 | Complete | 2026-03-25 |
| 8. 报表 | v1.1 | 3/3 | Complete | 2026-03-25 |
| 9. 智能分析工作台 | v1.2 | 1/1 | Complete | 2026-03-26 |
| 10. 后端联调 + Tech Debt | v1.2 | 1/1 | Complete | 2026-03-26 |
| 11. 后端 API 完善 | v1.2 | 0/1 | Not Started | — |
| 12. 前端视觉升级 | v1.2 | 2/2 | Complete | 2026-03-30 |
| 13. Claude Code AI 后端 | v1.3 | 0/3 | Not Started | — |

---

## Phase Details

### Phase 13: Claude Code AI 后端

**Goal:** Users can use Claude Code SDK for AI-powered security analysis with streaming dialogue

**Depends on:** Phase 12

**Requirements:** AG-01, AG-02, AG-03, AG-04, AG-05

**Success Criteria** (what must be TRUE):

1. User can install and configure claude-agent-sdk with DeepSeek API credentials
2. User can engage in streaming AI conversation via WebSocket with real-time responses
3. User can invoke custom security tools (alert queries, attack chain analysis) during conversation
4. System maintains conversation context across sessions
5. System gracefully handles API failures with fallback mechanism
6. E2E tests verify all integrations work correctly

**Plans:** 3 plans

**UI hint:** yes

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
    ↓
Phase 5 (多数据源支持)
    ↓
Phase 6 (产品级 UI)
    ↓
Phase 7 (AI 助手)
    ↓
Phase 8 (报表)
    ↓
Phase 9 (智能分析工作台)
    ↓
Phase 10 (后端联调 + Tech Debt)
    ↓
Phase 11 (后端 API 完善)
    ↓
Phase 12 (前端视觉升级)
    ↓
Phase 13 (Claude Code AI 后端)
```

---

## Phase 13 Plans

Plans:
- [ ] 13-01-PLAN.md - Agent 基础设施 (SDK 安装、客户端封装、工具定义)
- [ ] 13-02-PLAN.md - WebSocket 端点和前端集成
- [ ] 13-03-PLAN.md - 集成测试和 E2E 测试

---

## Archived Milestones

- [v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md) — Phases 1-4
- [v1.1-ROADMAP.md](./milestones/v1.1-ROADMAP.md) — Phases 5-8
- [v1.2-ROADMAP.md](./milestones/v1.2-ROADMAP.md) — Phases 9-12
