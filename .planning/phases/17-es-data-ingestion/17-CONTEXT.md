# Phase 17: ES 数据渠道接入 - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

增加从 Elasticsearch 中接入安全日志数据的渠道，使用 Logstash 作为数据拉取中间件。
</domain>

<decisions>
## Implementation Decisions

### 技术选型
- **D-01:** 使用 **Logstash** 而非 Python elasticsearch 库直接连接 ES
  - 原因：Vector 不支持把 ES 作为输入源主动拉数据
  - Logstash elasticsearch input 插件支持 Scroll API 深度分页

- **D-02:** Logstash 使用 **Docker Compose 容器化部署**
  - 版本：logstash:8.11.0（兼容 ES 8.x）
  - 复用现有基础设施

- **D-03:** JVM 内存锁死 `-Xms2g -Xmx2g`
  - 原因：避免 Logstash 把宿主机内存吃光被 OOM Killer 杀掉

### 数据拉取策略
- **D-04:** 使用 **Scroll API** 深度分页
  - `scroll => "5m"` 保持 5 分钟上下文
  - `size => 2000` 每次拉取量（避免旧 ES OOM）

- **D-05:** 幂等写入防止重复
  - input: `docinfo => true` 保留原始 _id
  - output: `document_id => "%{[@metadata][_id]}"` 复用旧 _id

### 数据处理
- **D-06:** 时间戳标准化
  - 使用 `date` filter 配合 `timezone => "Asia/Shanghai"`
  - ES 底层强制 UTC 存储

- **D-07:** 移除 ES 6.x `_type` metadata
  - ES 7.x/8.x 不兼容 _type
  - filter 中 `remove_field => ["[@metadata][_type]"]`

- **D-08:** 避免 Grok 正则，使用 dissect 或 json filter
  - 性能是 Grok 的 5-10 倍
  - 防止 Catastrophic Backtracking

### 输出目标
- **D-09:** 输出到 Kafka topic `raw-events`
  - 复用现有的 Kafka 采集通道
  - 进入系统的统一解析 pipeline

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `docker-compose.yml` — 现有基础设施定义
- `docs/使用Logstash从不同ES数据库版本中接入数据的最佳实践调研.md` — Logstash 选型和配置参考
</canonical_refs>

<code_context>
## Existing Code Insights

### Infrastructure
- Kafka: `kafka:9092`
- Elasticsearch: ES 8.x (已部署)
- Docker Compose 网络: `secalert`

### Environment Variables Pattern
```
ES_HOST=localhost:9200
ES_USER=elastic
ES_PASSWORD=changeme
ES_INDEX=security-alerts-*
```

### Kafka Topic
- 输入 topic: `raw-events` (接收原始事件)
- 现有 Vector 采集也输出到 `raw-events`
</code_context>

