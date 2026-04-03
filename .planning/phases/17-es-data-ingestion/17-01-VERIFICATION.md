---
phase: 17-es-data-ingestion
plan: "01"
verified: 2026-04-03T11:30:00Z
status: gaps_found
score: 2/4 must-haves verified
gaps:
  - truth: "ES 日志拉取与解析接入 (ES-03)"
    status: partial
    reason: "Pipeline 只配置了基础的 match_all 查询，没有实现实际的日志解析规则"
    artifacts:
      - path: "logstash/pipeline/es-input.conf"
        issue: "query => '{\"query\": { \"match_all\": {} }}' 是全量查询，不是告警解析；filter 只有基础的时间戳标准化"
    missing:
      - "具体的告警字段映射规则"
      - "OGS/ECS 格式转换配置"
      - "实际可运行的查询条件（而非 match_all）"
  - truth: "ES 告警数据采集流程 (ES-04)"
    status: failed
    reason: "没有端到端验证数据是否真正从 ES 流入 Kafka，也没有验证数据格式是否符合预期"
    artifacts:
      - path: "logstash/pipeline/es-input.conf"
        issue: "stdout { codec => rubydebug } 调试输出仍在配置中，说明未完成验证"
    missing:
      - "端到端数据流验证"
      - "数据格式验证（确保输出到 Kafka 的数据可用）"
      - "生产环境配置（调试输出应被注释或移除）"
---

# Phase 17: ES 数据渠道接入 验证报告

**Phase Goal:** 增加从 Elasticsearch 中接入安全日志数据的渠道
**Verified:** 2026-04-03
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Logstash Docker 服务可启动 | VERIFIED | docker-compose.yml 包含 logstash:8.11.0 服务定义，JVM 内存锁死配置存在 |
| 2 | ES-01: ES 数据源连接配置 | VERIFIED | ES_HOST, ES_USER, ES_PASSWORD 环境变量已配置并通过 ${VAR:default} 注入 pipeline |
| 3 | ES-02: ES 查询模板管理 | VERIFIED | Index Pattern (ES_INDEX)、Scroll API (scroll:5m, size:2000)、Query DSL (query)、Time Field (@timestamp) 均已配置 |
| 4 | ES-03: ES 日志拉取与解析接入 | PARTIAL | Pipeline 配置存在但只有 match_all 全量查询，没有实际告警解析规则 |
| 5 | ES-04: ES 告警数据采集流程 | FAILED | 没有端到端验证，调试输出仍存在 |

**Score:** 2/4 requirements fully verified (ES-01, ES-02); 1 partial (ES-03); 1 failed (ES-04)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docker-compose.yml` | Logstash 服务定义 | VERIFIED | 第 161-174 行，logstash:8.11.0，JVM -Xms2g -Xmx2g |
| `logstash/config/logstash.yml` | Logstash 基本配置 | VERIFIED | http.host: 0.0.0.0, xpack.monitoring.enabled: false |
| `logstash/pipeline/es-input.conf` | ES→Kafka pipeline | VERIFIED | input(elasticsearch) → filter(date/mutate) → output(kafka) |
| `.env` | ES 连接配置 | VERIFIED | ES_HOST, ES_USER, ES_PASSWORD, ES_INDEX, LOGSTASH_ENABLED |
| `.env.example` | 环境变量模板 | VERIFIED | 包含所有 ES 相关配置 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Logstash | Kafka | kafka output plugin | WIRED | bootstrap_servers: kafka:9092, topic: raw-events |
| Logstash | Elasticsearch | elasticsearch input plugin | WIRED | hosts, user, password, index 从环境变量注入 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| es-input.conf | ES documents | elasticsearch input (scroll API) | UNCERTAIN | 配置存在但未验证实际数据流 |
| es-input.conf | Kafka messages | kafka output | UNCERTAIN | 配置存在但未验证端到端 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| logstash/pipeline/es-input.conf | 39 | `stdout { codec => rubydebug }` | WARNING | 调试输出未移除，生产环境不应有 stdout |
| logstash/pipeline/es-input.conf | 11 | `query => '{"query": { "match_all": {} }}'` | INFO | 全量查询占位符，需要替换为实际告警过滤条件 |

### Human Verification Required

#### 1. 端到端数据流验证

**Test:** 启动 Logstash 容器，配置真实的 ES 连接，观察 Kafka 输出
**Expected:** ES 中的告警数据成功输出到 Kafka 的 `raw-events` topic
**Why human:** 需要实际运行 Docker 容器和观察 Kafka 消息

#### 2. 数据格式验证

**Test:** 检查 Kafka 消息内容是否符合 OCSF/ECS 格式
**Expected:** 时间戳已标准化，字段映射正确
**Why human:** 需要解析 Kafka 消息查看实际内容

## Gaps Summary

**Phase 17 目标要求覆盖 ES-01 ~ ES-04 共 4 个 requirement，但本 wave (17-01) 只完成了 2 个 (ES-01, ES-02)。**

**ES-03 "ES 日志拉取与解析接入" - 部分完成:**
- Pipeline 结构正确（input → filter → output）
- 但 query 使用 `match_all` 全量查询，不是真正的告警过滤
- filter 只有基础的 date mutate，没有实际的字段解析/映射规则

**ES-04 "ES 告警数据采集流程" - 未验证:**
- 配置已创建但没有端到端验证
- `stdout { codec => rubydebug }` 注释说"调试用（完成后注释掉）"但仍在配置中
- 缺少生产级配置（调试输出应被移除或注释）

**建议后续 plan 聚焦:**
1. 替换 match_all 为实际告警查询条件
2. 添加字段解析/映射 filter
3. 移除调试输出
4. 端到端验证数据流

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
