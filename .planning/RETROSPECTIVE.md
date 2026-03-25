# Retrospective

## Milestone: v1.0 MVP — 2026-03-25

**Shipped:** 2026-03-25
**Phases:** 4 | **Plans:** 15 | **Tasks:** 39 | **Files:** 170 | **LOC:** 28,760

### What Was Built

- Docker Compose with 6 infrastructure services (Kafka, Elasticsearch, Redis, PostgreSQL, Vector, Zookeeper)
- Vector agent: Suricata BSD syslog via TCP 514 → Kafka topic with at-least-once delivery
- Three-tier parsing pipeline: template matching → Drain clustering → DSPy/LLM fallback
- PostgreSQL alerts table with UUID PK, JSONB storage, Redis 24h deduplication
- Neo4j attack chain storage with ATT&CK technique mapping
- DSPy 分类器和严重度评分：攻击链级别误报过滤，置信度 0.5 阈值
- React + TypeScript 前端：告警列表、详情单屏、时间线、处置建议组件
- REST API 端点：/api/chains、/api/analysis、/api/remediation

### What Worked

- GSD workflow 确保了所有 phase 有完整文档和验证
- UAT 测试覆盖全面（39/39 全部通过）
- Integration gap 在 UAT 阶段发现并修复（6/6）
- 规则优先 + LLM 兜底策略在各个 phase 一致应用

### What Was Inefficient

- Phase 1-4 全部由 AI 端到端执行，无人工验收环节
- REQUIREMENTS.md checkbox 未及时更新（文档滞后）
- v1.0-MILESTONE-AUDIT.md gap 状态在 gap 修复后未同步更新

### Patterns Established

- 三层解析架构（模板 → Drain → LLM）在 Phase 1 确定，Phase 2/3/4 沿用
- 攻击链级别判断（非单条告警）作为 Phase 2-4 的一致性基准
- Docker Compose 单命令启动全部服务

### Key Lessons

- UAT 应在每次 phase 完成后立即执行，而非 milestone 末尾
- 文档更新应在修复提交时同步进行，而非事后补录
- Integration gap 应在 phase 交接时检查，而非等到 UAT

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 4 |
| Plans | 15 |
| Tasks | 39 |
| Files | 170 |
| LOC | 28,760 |
| UAT Pass Rate | 100% (39/39) |
| Integration Gaps Found | 8 |
| Integration Gaps Fixed | 8 |
| Tech Debt Items | 2 |
