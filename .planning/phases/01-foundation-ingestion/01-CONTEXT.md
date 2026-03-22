# Phase 1: Foundation & Ingestion - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

构建技术基础设施和日志采集管道。系统通过 Vector → Kafka → 三层解析器 → PostgreSQL/Redis，完成 Suricata 开源 IDS 告警的采集、解析和存储。

Phase 1 验证标准：至少一种设备类型（Suricata）可完成「采集→解析→存储」全流程。

</domain>

<decisions>
## Implementation Decisions

### 首批设备

- **设备类型：** Suricata（开源 IDS）
- **采集协议：** Syslog → Vector syslog source → Kafka
- **理由：** 开源生态、部署快速、EVE JSON 格式标准化、社区文档丰富
- **测试数据：** Qwen3-32B 生成 Suricata EVE JSON 格式模拟告警

### Kafka 主题结构

- **分区方案：** 按设备类型分区
- **主题命名：** `raw-suricata`、`raw-firewall` 等
- **Consumer 策略：** 每个设备类型独立 Consumer Group
- **理由：** 独立扩展、设备类型隔离、解析逻辑解耦

### 解析器输出格式

- **输出格式：** 直接 OCSF 标准格式
- **存储目标：** Elasticsearch（OCSF 格式索引）
- **理由：** 标准化互操作、跨系统兼容、未来扩展性

### 本地开发环境

- **方案：** Docker Compose 全家桶
- **组件：** Vector + Kafka + Zookeeper + Elasticsearch + Redis + PostgreSQL + Suricata(模拟容器)
- **测试数据生成：** Qwen3-32B 生成 EVE JSON 模拟告警 Syslog 流
- **一键启动：** `docker-compose up` 启动完整测试环境

### Claude's Discretion

- 三层解析器具体参数阈值（Drain 聚类深度、超时配置等）
- Redis 去重窗口大小和缓存策略
- Vector 具体配置细节（缓冲区大小、重试策略等）
- PostgreSQL 表结构和索引策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture

- `.planning/codebase/ARCHITECTURE.md` — 系统分层架构、数据流图、三层解析器设计
- `.planning/codebase/STACK.md` — 技术栈版本依赖（Vector、Kafka、Flink、Elasticsearch 等）

### Integrations

- `.planning/codebase/INTEGRATIONS.md` — Vector source 配置、数据库/JDBC 采集规范

### Conventions

- `.planning/codebase/CONVENTIONS.md` — 数据格式规范（OCSF/ECS/CEF）、Python 编码规范、DSPy 签名定义

### Project

- `.planning/PROJECT.md` — 核心约束：私有化离线部署、Qwen3-32B 推理、无外部云依赖
- `.planning/ROADMAP.md` — Phase 1 成功标准（Vector 采集、Kafka 不丢数据、三层解析、PostgreSQL 存储、Redis 去重）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `parser/templates/` — 预置解析模板目录结构（Phase 1 建立 Suricata EVE JSON 模板）
- `parser/dspy/signatures/LogParserSignature` — DSPy 解析签名（Phase 1 建立首个模板匹配 + LLM fallback）
- `collector/configs/` — Vector source 配置目录

### Established Patterns

- 三层解析架构：模板优先 → Drain 聚类 → LLM 兜底（已确定）
- Vector 统一采集框架（已确定）
- Kafka 消息队列作为采集层和解层解耦（已确定）

### Integration Points

- Vector → Kafka：Kafka sink 配置
- Kafka → 解析器：Consumer Group 配置
- 解析器 → Elasticsearch：OCSF 格式索引写入
- Redis → 去重状态缓存

</code_context>

<specifics>
## Specific Ideas

- Qwen3-32B 生成模拟 Suricata EVE JSON 告警 Syslog 流用于测试
- Docker Compose 一键启动完整测试环境
- 按设备类型独立 Kafka topic，便于后续扩展新设备类型

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-ingestion*
*Context gathered: 2026-03-22*
