# Project Research Summary

**Project:** SecAlert v1.5 多源异构安全日志采集优化
**Domain:** 安全告警分析平台 - 采集层扩展
**Researched:** 2026-04-02
**Confidence:** MEDIUM-HIGH

## Executive Summary

v1.5 在 v1.0 已验证的三层解析架构（Vector + Kafka + Flink Parser）基础上，扩展多渠道采集后端、采集可观测性+DLQ、以及全局元数据体系三个能力域。核心推荐方案是在现有 Kafka Buffer 层之前新增 Ingestion Gateway Service，作为统一采集网关，所有新渠道（Kafka Topic订阅、Webhook、REST API、数据库轮询）必须通过 Metadata Enricher 注入强制元数据后进入解析管道。

**推荐构建顺序：** 全局元数据体系 -> Webhook/ REST Poller（简单渠道）-> Kafka Consumer/ Database Poller（复杂渠道）-> DLQ -> 监控 -> 统一管理。这种顺序确保所有采集渠道在监控和 DLQ 能力就绪之前已经具备完整的元数据注入，避免 metadata 缺失导致的 OCSF 映射失败。

**关键风险：** metadata 注入破坏现有 Suricata 解析（Pitfall 4）是最高优先级风险，DLQ 设计为"坟墓"而非队列（Pitfall 2）是运维级最高风险。两个风险都必须在本阶段设计中解决，否则会破坏 v1.0 稳定性或导致故障时无法恢复。

## Key Findings

### Recommended Stack

**结论：只需新增 1 个库（prometheus-client），其余复用现有技术栈。**

现有技术栈已完整覆盖 v1.5 需求：
- confluent-kafka 2.13.2 支持 Kafka Consumer/Producer 多 Topic 和 DLQ
- httpx >=0.24.0 支持 REST API 轮询
- APScheduler >=3.10.0 支持定时任务
- FastAPI >=0.100.0 支持 Webhook 接收网关
- redis >=5.0.0 支持游标状态存储

| 技术 | 版本 | 用途 | 理由 |
|------|------|------|------|
| **prometheus-client** | >=0.19.0 | 采集管道监控指标 | 私有化部署首选，相比 OpenTelemetry 更轻量 |
| confluent-kafka | 2.13.2 | Kafka 多 Topic 订阅和 DLQ | 已有库完整支持 |
| httpx | >=0.24.0 | REST API 轮询 | 已有库，支持异步 |
| APScheduler | >=3.10.0 | 定时任务 | 已有库 |

**不推荐添加：** Kafka Connect（过度工程）、Flink（处理量级不需要）、Pulsar/RabbitMQ（已有 Kafka 足够）、AWS/Azure SDK（违反私有化约束）。

### Expected Features

**Must have (table stakes):**
- Kafka Consumer Group 订阅 — 支持消费外部 Kafka Topic 日志
- Webhook 接收端点 — 接收第三方/SaaS 安全产品推送
- REST API / Database 轮询调度器 — 定时拉取告警
- 统一事件入 Kafka — 所有渠道事件统一写入 raw-events Topic
- 死信队列（DLQ）— 解析失败日志不丢失，3 次重试 + 告警
- EPS 监控 + 采集延迟监控 + 错误率统计 + 渠道健康告警
- 强制 vendor_name/product_name/device_type + OCSF target + tenant_id/environment

**Should have (differentiators):**
- 背压机制 — 防止后端过载时采集端继续发送导致崩溃（高复杂度）
- 自适应采集速率 — 根据后端负载动态调整轮询频率（高复杂度）
- DLQ 自动重试 + 采集趋势预测（中复杂度）
- metadata AI 推断 — 首次接入设备时 AI 自动推断 vendor/product（高复杂度）

**Defer (v2+):**
- 背压机制（Phase 2+ 再做）
- 自适应采集速率
- 跨租户关联分析（MSSP 场景）
- metadata 版本管理

**Anti-Features（明确不做）：**
- S3/OSS + MQ 云存储事件触发 — 私有化部署无 S3，违反约束
- 云厂商专属 SDK — 私有化部署不支持
- 全球全渠道自动发现 — 复杂度爆炸，运维不可控
- 自动背压到所有采集源 — 可能导致采集源雪崩
- 实时采集延迟 < 100ms — 私有化环境网络不稳定，追求低延迟不现实

### Architecture Approach

v1.5 在现有架构基础上，新增 **Ingestion Gateway Service** 作为统一采集网关，位于 Kafka (raw-events) 之前。所有渠道数据经 Metadata Enricher 注入强制元数据后进入解析管道。

```
[新渠道数据流]
Kafka Topic订阅 / Webhook / REST API / DB轮询
        ↓
Ingestion Manager（任务生命周期管理）
        ↓
Metadata Enricher（强制注入 vendor/product/device/tenant/environment）
        ↓
Kafka Producer → raw-events Topic
        ↓
Flink Parser（模板匹配 → Drain聚类 → DSPy/LLM）
        ↓
┌─────────────────┬─────────────────┐
│ Storage (ES/Neo4j/MinIO) │ DLQ Router → dlq-events │
└─────────────────┴─────────────────┘
```

**Major components:**
1. **IngestionManager** — 采集任务注册/注销、健康检查、生命周期管理
2. **MetadataEnricher** — 全局元数据强制注入，vendor/product/device/OCSF/tenant/environment
3. **KafkaConsumerService** — 多 Topic 订阅、Consumer Group、Offset 管理
4. **WebhookGateway** — HTTP POST 接收、Header 鉴权、IP 白名单
5. **RestPollerService / DatabasePollerService** — 定时轮询、增量游标追踪、限流重试
6. **DLQRouter / DLQConsumerService** — 解析失败路由、MinIO 归档、告警通知
7. **EPSMonitor / LagMonitor / BackpressureHandler** — Prometheus 指标暴露

### Critical Pitfalls

1. **Metadata 注入破坏现有解析（Pitfall 4）** — 强制 metadata 要求如果设计不当会破坏现有三层解析架构，导致 Suricata 解析失败。**预防：** 在解析管道入口定义 `EnrichedEvent` 模型，包含 metadata 字段，所有层必须透传；每个 Phase 15 子任务都必须包含 v1.0 Suricata 回归测试。

2. **DLQ 设计为"坟墓"而非队列（Pitfall 2）** — DLQ 收集大量解析失败日志但没有消费机制，故障恢复时无法重放。**预防：** DLQ 设计必须包含完整生命周期（写入 -> 告警阈值 -> 自动重试 -> 人工处理 -> 最终归档）；DLQ 消息必须包含原始时间戳和重试次数。

3. **背压机制实现错误导致级联崩溃（Pitfall 3）** — 后端过载时采集层收到 429 不是减慢而是断开重试，反而造成更大流量。**预防：** 区分 429（减慢）、5xx（重试）、timeout（减慢）；实现指数退避重试；Vector 配置 `queue_mode: block`。

4. **多渠道并发导致 Kafka 分区热点（Pitfall 5）** — 所有数据写入同一个 Topic 的前几个分区，导致部分分区过载。**预防：** Partition key 设计考虑数据量和优先级：`<tenant_id>_<device_type>_<hash>`；监控分区 lag 不均衡。

5. **数据库轮询没有处理增量游标导致数据重复（Pitfall 7）** — 没有正确实现增量游标，每次拉取全量或游标不回退。**预防：** 游标必须持久化到数据库或 Kafka offset；实现幂等去重（device_id, event_id, timestamp）。

## Implications for Roadmap

基于研究，建议以下阶段结构：

### Phase 1: 全局元数据体系
**Rationale:** 所有采集渠道依赖 metadata 注入，必须最先构建
**Delivers:**
- `MetadataEnricher` 组件，元数据强制注入
- `OCSFMapper` 组件，OCSF 标准映射
- `IngestionSource` 数据模型，source_type 枚举支持 KAFKA/WEBHOOK/API/DB
- UI 表单强制验证 vendor_name/product_name/device_type/OCSF target
**Avoids:** Pitfall 4（metadata 耦合破坏现有解析）、Pitfall 10（多租户泄露）
**Research Flags:** OCSF 规范有官方文档，HIGH confidence

### Phase 2: Webhook 接收网关
**Rationale:** 最简单的新渠道，快速验证采集通道 + metadata 注入
**Delivers:**
- HTTP POST endpoint `/api/ingest/webhook/{source_id}`
- Header secret 鉴权 + HMAC 签名验证
- 事件写入 Kafka + metadata header 注入
**Uses:** FastAPI（已有）、python-multipart（已有）
**Avoids:** Pitfall 9（签名验证时间戳缺失）
**Research Flags:** Webhook 模式成熟，HIGH confidence

### Phase 3: Kafka Consumer 订阅 + REST Poller
**Rationale:** Kafka 订阅扩展现有 Kafka 基础设施，REST Poller 验证 API 轮询模式
**Delivers:**
- MultiTopicConsumer，支持订阅外部 Kafka Topic
- Consumer Group 管理、Offset 管理（earliest/latest 明确配置）
- REST Poller，httpx + APScheduler，支持游标翻页和限流重试
**Uses:** confluent-kafka（已有）、httpx（已有）
**Avoids:** Pitfall 14（offset 管理错误）、Pitfall 5（分区热点）
**Research Flags:** Kafka 订阅需要明确 offset 策略

### Phase 4: Database Poller + JDBC 增强
**Rationale:** 复杂状态管理（增量游标、JDBC 连接），在 REST Poller 之后做
**Delivers:**
- DatabasePoller，支持 SQLAlchemy 2.0+ 适配多种国产数据库
- 增量游标持久化（Redis 或 Kafka offset）
- 幂等去重（device_id, event_id, timestamp）
**Uses:** psycopg2（已有）、redis（已有）
**Avoids:** Pitfall 7（增量游标缺失导致数据重复）
**Research Flags:** 国产数据库（达梦、openGauss、Kingbase）驱动兼容性需要验证

### Phase 5: DLQ 机制
**Rationale:** 依赖解析层失败场景，必须在监控就绪后构建
**Delivers:**
- DLQ Router，解析失败消息路由到 `dlq-events` Topic
- DLQ Consumer，MinIO 归档存储 + 告警通知
- 完整生命周期：写入 -> 告警阈值 -> 3 次重试 -> 人工处理
**Avoids:** Pitfall 2（DLQ 变成坟墓）、Pitfall 8（DLQ 和监控存储单点）
**Research Flags:** DLQ 生命周期设计需要评审

### Phase 6: 监控体系（EPS / Lag / Backpressure）
**Rationale:** 依赖所有渠道运行数据，最后构建
**Delivers:**
- Prometheus metrics endpoint `/metrics/collection`
- EPS 监控（多时间窗口：1分钟/5分钟/1小时）
- 采集延迟监控（事件产生到入 Kafka）
- 背压 Handler（基于 Kafka consumer lag）
**Uses:** prometheus-client >=0.19.0（新增）
**Avoids:** Pitfall 6（EPS 阈值单一导致误报）、Pitfall 3（背压实现错误）
**Research Flags:** Prometheus 方案标准，HIGH confidence

### Phase 7: Ingestion Manager 统一整合
**Rationale:** 最后整合所有渠道生命周期管理
**Delivers:**
- 统一采集任务注册/注销
- 渠道健康检查（连续 5 分钟 EPS=0 告警）
- 背压统一控制
**Research Flags:** 整合测试需要完整环境

### Phase Ordering Rationale

1. **Metadata 先于所有渠道** — 所有采集事件必须携带 metadata，否则 OCSF 映射失败（Pitfall 1）
2. **简单渠道先于复杂渠道** — Webhook（低风险）-> REST API（中风险）-> Kafka/DB（中风险）
3. **DLQ 在监控之后** — DLQ 告警需要监控指标支持
4. **背压最后做** — 背压是高复杂度功能，需要完整环境验证（Pitfall 3）
5. **每阶段包含 Suricata 回归测试** — 确保不破坏 v1.0 验证通过的采集

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (Database Poller):** 国产数据库驱动兼容性需要实际环境验证
- **Phase 6 (Backpressure):** 反馈控制环复杂，可能需要 PoC 验证稳定性
- **Phase 7 (Ingestion Manager):** 多渠道生命周期管理需要完整环境测试

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (Webhook):** HTTP POST 接收模式成熟，FastAPI 原生支持
- **Phase 3 (Kafka Consumer):** Kafka 订阅模式标准，confluent-kafka 文档完整
- **Phase 5 (DLQ):** DLQ 模式行业标准（Cribl, Vector, Logstash 最佳实践）

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 事实标准技术栈，仅新增 prometheus-client |
| Features | MEDIUM-HIGH | 表干/差异化功能区分清晰，MVP 范围明确 |
| Architecture | MEDIUM | 基于现有架构扩展，DLQ/Monitoring 模式成熟 |
| Pitfalls | MEDIUM | 基于领域通用知识，外部验证受限 |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **国产数据库驱动兼容性（Phase 4）：** 达梦(dmPython)、openGauss(psycopg2)、Kingbase、TiDB(pymysql) 需要在规划阶段验证连接串格式和 SQL 兼容性
- **背压机制稳定性（Phase 6）：** 反馈控制环可能震荡，建议实现前做 PoC 验证
- **DLQ 重试策略（Phase 5）：** 自动重试可能产生死循环，需要版本跟踪和重试上限严格控制
- **Kafka partition 热点（Phase 3）：** Partition key 设计需要在实现前评审

## Sources

### Primary (HIGH confidence)
- confluent-kafka-python GitHub — Kafka Python 客户端官方文档
- Prometheus Python Client GitHub — 监控指标库官方文档
- OCSF Schema GitHub (ocsf/ocsf-schema) — OCSF 标准规范
- HTTPX 文档 — 异步 HTTP 客户端
- FastAPI Webhook 最佳实践 — Webhook 接收模式

### Secondary (MEDIUM confidence)
- 多源异构安全日志采集最佳实践调研 — 内部文档
- Phase 15 Research — v1.5 研究文件
- 业界 DLQ 模式（Cribl, Vector, Logstash 最佳实践）
- Reactive Streams Backpressure 模式

### Tertiary (LOW confidence)
- 国产数据库驱动兼容性 — 需要实际环境验证
- 背压机制实现细节 — 需要 PoC 验证

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
