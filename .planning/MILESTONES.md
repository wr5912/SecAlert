# Milestones

## v1.0 MVP (Shipped: 2026-03-25)

**Phases completed:** 4 phases, 15 plans, 39 tasks

**Key accomplishments:**

- Docker Compose with 6 infrastructure services (Kafka, Elasticsearch, Redis, PostgreSQL, Vector, Zookeeper) for local development
- Vector agent configured to receive Suricata BSD syslog via TCP on port 514 and reliably deliver events to Kafka topic raw-suricata with acks: all
- Three-tier parsing pipeline implemented: template matching (Tier 1) -> Drain clustering (Tier 2) -> DSPy/LLM fallback (Tier 3), with Suricata EVE JSON template
- PostgreSQL alerts table with UUID PK, JSONB storage, Redis 24h deduplication, and Suricata-to-OCSF mapper implemented
- None
- Plan:
- Plan:
- DSPy 分类器和严重度评分模块：攻击链级别误报过滤（规则优先 + LLM 兜底），置信度 0.5 阈值，ATT&CK 技术严重度基准
- AnalysisService 分析服务（Neo4j 读取 + 分类 + 软删除）+ FalsePositiveMetricsCollector 误报率统计（< 30% 目标判断）
- 分析层 REST API 端点 + 分类器/严重度/指标单元测试
- 计划:
- React + TypeScript 前端项目，包含告警列表、详情单屏、时间线和处置建议组件
- 响应平台 API 端点扩展完成：列表查询、状态检查、完整告警获取；前端已抑制 Tab 支持恢复功能

---
