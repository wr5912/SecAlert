# Feature Landscape: v1.5 多渠道采集后端 + 采集可观测性 + 全局元数据体系

**Domain:** 安全告警分析平台 - 采集层扩展
**Researched:** 2026-04-02
**Mode:** Ecosystem (多渠道采集、DLQ 机制、全局元数据系统)
**Confidence:** MEDIUM-HIGH（基于现有系统架构 + 最佳实践调研文档，外部搜索受限）

---

## 概述

v1.5 在 v1.0 已验证的三层解析架构（Vector + Kafka 采集 BSD Syslog via TCP 514）基础上，扩展三个能力域：

1. **多渠道采集后端**：支持 Kafka Topic 订阅、Webhook 接收网关、REST API/数据库定时轮询
2. **采集可观测性 + DLQ**：死信队列、EPS 监控、采集延迟告警、背压机制
3. **全局元数据体系**：强制 metadata 标签（vendor_name/product_name/device_type + OCSF target + tenant_id/environment）

**已有基础（不可忽略）：**

- Vector + Kafka 采集通道（Suricata TCP 514）
- 三层解析 pipeline：模板匹配 -> Drain 聚类 -> DSPy/LLM 兜底
- Data Source Template CRUD API + UI
- AI 自动检测日志格式（CEF/Syslog/JSON/Custom）
- Draggable field mapping UI + 实时预览
- 批量导入设备 CSV/Excel
- preview-parse endpoint

**核心约束：** 私有化离线部署，无外部云依赖。所有设计必须符合此约束。

---

## 1. 多渠道采集后端（Multi-Channel Ingestion Backend）

### 1.1 渠道分类

| 梯队 | 渠道类型 | 优先级 | 适用场景 | 复杂度 |
|------|----------|--------|----------|--------|
| **第一梯队** | Kafka Topic 订阅 | 首选 | 云平台、大型安全设备海量日志 | Medium |
| **第一梯队** | Webhook 接收网关 | 首选 | SaaS 安全产品、第三方云告警 | Low |
| **第二梯队** | REST API 定时轮询 | 次选 | 第三方告警 API、无推送能力平台 | Medium |
| **第二梯队** | 数据库定时轮询 | 次选 | 内部数据库审计日志、SQL Server/Oracle | Medium |
| **第三梯队** | Syslog 接收（已有） | 已有 | 传统网络设备、安全设备 | Low |
| **第三梯队** | 文件监听（已有 Vector） | 已有 | 日志文件、JSON 文件 | Low |

**说明：** 私有化部署约束下，"云原生通道"如 S3+MQ 不适用，但 Kafka Topic 订阅和 Webhook 完全可用。

### 1.2 表干功能（Table Stakes）

这些是用户期望的基本能力，缺失则产品不完整。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Kafka Consumer Group 订阅 | 支持消费外部 Kafka Topic 日志 | Medium | 已有 Kafka 基础设施，扩展 consumer 逻辑 |
| Webhook 接收端点 | 接收第三方/SaaS 安全产品推送 | Low | 新增 HTTP POST endpoint |
| REST API 轮询调度器 | 定时拉取 REST API 告警 | Medium | 需要状态跟踪（翻页、光标） |
| 数据库 JDBC 轮询 | 定时查询数据库告警表 | Medium | 需要递增游标字段 |
| 统一事件入 Kafka | 所有渠道事件统一写入 raw-events Topic | Low | 复用现有 Kafka 基础设施 |

### 1.3 差异化功能（Differentiators）

这些功能不是用户预期的，但能带来价值。

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 背压机制（Backpressure） | 防止后端过载时采集端继续发送导致崩溃 | High | 需要信号反馈到采集端 |
| 采集源健康检查 | 自动检测某渠道采集中断并告警 | Medium | 统计各渠道 EPS 异常 |
| 多渠道优先级队列 | 不同渠道事件打不同优先级标签 | Medium | 高优先级渠道优先解析 |

### 1.4 架构集成点

```
[现有架构 - 保持不变]
Vector (TCP 514) → Kafka (raw-events) → Flink Parser → ES/Neo4j/MinIO

[v1.5 新增渠道]
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         ▼                                ▼                                ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│ Kafka Consumer  │              │  Webhook Gateway │              │  REST/DB Poller  │
│ (Topic 订阅)    │              │  (HTTP POST)     │              │  (定时任务)      │
└────────┬────────┘              └────────┬────────┘              └────────┬────────┘
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │   Kafka (raw-events)     │  ← 统一入口
                              │   + metadata headers    │
                              └─────────────────────────┘
                                          │
                                          ▼
                              [现有 Flink Parser Pipeline]
```

### 1.5 依赖现有系统

| 现有组件 | v1.5 变更 | 集成方式 |
|----------|-----------|----------|
| Kafka | 新增 consumer group 或共享现有 | 新渠道共用 `raw-events` Topic |
| Flink Parser | 无需修改 | 解析层只关心 Kafka 消息，不关心来源 |
| ThreeTierParser | 无需修改 | 复用现有解析能力 |
| Vector | 不修改现有配置 | 新渠道通过其他方式接入 |
| Template CRUD API | 扩展支持新渠道类型 | source_type 枚举新增 KAFKA/WEBHOOK/API/DB |

### 1.6 配置模型

```yaml
# 数据源配置示例
data_sources:
  - id: "ds-001"
    name: "阿里云云安全中心"
    source_type: "WEBHOOK"           # KAFKA | WEBHOOK | API | DB | SYSLOG | FILE
    enabled: true

    # Webhook 特有
    webhook:
      path: "/api/ingest/aliyun"
      auth_type: "header_secret"     # header_secret | ip_whitelist | none
      secret_header: "X-Webhook-Secret"

    # API 轮询特有
    api:
      url: "https://api.example.com/alerts"
      method: "GET"
      auth_type: "bearer_token"
      interval_seconds: 300
      cursor_field: "next_token"
      rate_limit:
        max_requests_per_minute: 60
        backoff_seconds: 30

    # Kafka 特有
    kafka:
      broker: "kafka:9092"
      topic: "cloud-security-alerts"
      consumer_group: "secalert-aliyun"
      offset: "latest"               # earliest | latest

    # DB 轮询特有
    database:
      jdbc_url: "jdbc:oracle:thin:@10.0.0.1:1521:orcl"
      table: "security_alerts"
      cursor_field: "alert_id"
      interval_seconds: 60

    # 强制元数据（所有渠道必须）
    metadata:
      vendor_name: "aliyun"
      product_name: "cloud_security_center"
      device_type: "cloud_security"
      target_category_uid: 2         # OCSF 告警类
      target_class_uid: 2001
      tenant_id: "tenant-001"
      environment: "prod"
```

---

## 2. 采集可观测性 + DLQ（Collection Observability + Dead Letter Queue）

### 2.1 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 死信队列（DLQ） | 解析失败的日志不能丢失，安全合规要求 | Medium | 独立 Kafka Topic 或 MinIO 存储 |
| EPS 监控 | 每秒事件数，衡量采集吞吐 | Low | 简单计数统计 |
| 采集延迟监控 | 事件产生到写入 Kafka 的延迟 | Low | 事件携带 timestamp |
| 错误率统计 | 解析成功率/失败率 | Low | 聚合统计 |
| 渠道健康告警 | 某渠道连续失败时通知管理员 | Low | 阈值告警 |

### 2.2 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 背压机制（Backpressure） | 后端过载时主动降速，防止 OOM | High | 需要 HTTP 429 / 队列满信号 |
| 自适应采集速率 | 根据后端负载动态调整轮询频率 | High | 反馈控制环 |
| DLQ 自动重试 | 解析失败的日志稍后自动重解析 | Medium | 需要版本跟踪，避免死循环 |
| 采集趋势预测 | 基于历史数据预测采集瓶颈 | Medium | 时序预测 |

### 2.3 DLQ 设计

**DLQ 存储策略：**

| 存储位置 | 适用场景 | 优点 | 缺点 |
|----------|----------|------|------|
| Kafka Topic (`dlq-events`) | 临时存储，等待重处理 | 与现有架构一致，可复用 consumer | 消息堆积可能影响 Kafka 性能 |
| MinIO + 数据库索引 | 长期存储，需要人工审查 | 成本低，支持大容量 | 人工介入复杂 |

**推荐方案：** Kafka Topic (`dlq-events`) + 24 小时保留期 + 自动清理

**DLQ 事件格式：**

```json
{
  "dlq_id": "dlq-20260402-001",
  "source_datasource_id": "ds-001",
  "source_type": "WEBHOOK",
  "raw_event": "<original base64 encoded>",
  "parse_error": "JSONDecodeError: Expecting property name enclosed in double quotes",
  "failed_at": "2026-04-02T10:30:00Z",
  "retry_count": 0,
  "max_retries": 3,
  "metadata": {
    "vendor_name": "aliyun",
    "product_name": "cloud_security_center",
    "device_type": "cloud_security"
  }
}
```

**DLQ 处理流程：**

```
事件解析失败
      │
      ▼
写入 DLQ Topic (dlq-events)
      │
      ├──→ [重试上限未达] ──→ 定时任务重新解析 ──→ 成功则写入 raw-events
      │                         │
      │                         └──→ 失败则 retry_count++ ──→ 再次入 DLQ
      │
      └──→ [重试上限已达] ──→ 告警通知管理员 ──→ 人工处理
```

### 2.4 监控指标

| 指标 | 计算方式 | 告警阈值建议 | 复杂度 |
|------|----------|--------------|--------|
| `eps_in` | 最近 1 分钟事件数 / 60 | > 10000 正常，< 100 可能异常 | Low |
| `eps_out` | Flink 输出的解析成功事件数 | eps_in 的 95% 以上 | Low |
| `parse_success_rate` | 成功解析数 / 总数 | < 90% 告警 | Low |
| `collection_lag_ms` | 当前时间 - 事件 timestamp | > 5000ms 告警 | Low |
| `dlq_size` | DLQ Topic 当前消息数 | > 1000 告警 | Low |
| `datasource_health` | 每渠道 EPS 是否 > 0 | 连续 5 分钟 = 0 则告警 | Medium |

### 2.5 背压机制

**背压信号类型：**

| 信号来源 | 信号类型 | 响应动作 |
|----------|----------|----------|
| Kafka Consumer Lag | 消费 lag > N 万条 | 降低 producer 发送速率 |
| Flink 处理延迟 | 处理时间 > 预期 2x | 减少并行度 |
| HTTP 429 Too Many Requests | Webhook 上游返回 | 增加重试间隔 |
| 队列满 | Redis/内存队列堆积 | 暂停拉取，等待消化 |

**实现建议：** 使用令牌桶算法控制发送速率，动态调整 `target_eps`。

---

## 3. 全局元数据体系（Global Metadata System）

### 3.1 表干功能（Table Stakes）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 强制 vendor_name/product_name/device_type | OCSF 标准化映射需要这些字段 | Low | 表单验证必填 |
| OCSF target (category_uid/class_uid) | 确定解析目标模板和告警类型 | Low | 下拉选择 |
| tenant_id 多租户隔离 | MSSP 场景需要数据隔离 | Medium | 影响所有查询 |
| environment 环境标签 | 区分 prod/dev/test 告警 | Low | 简单标签 |
| metadata 自动注入 | 所有入站事件自动附加 metadata | Low | Kafka header 或 payload |

### 3.2 差异化功能（Differentiators）

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| metadata 自动推断 | 首次接入设备时，AI 自动推断 vendor/product | High | 使用 LLM 分析日志样本 |
| metadata 版本管理 | 支持历史版本的 metadata 切换 | Medium | 便于回滚 |
| 跨租户关联分析 | MSSP 场景下跨租户威胁关联 | High | 安全合规复杂 |

### 3.3 元数据 Schema

```yaml
# 全局元数据配置
metadata_schema:
  # 必填字段
  required:
    - vendor_name
    - product_name
    - device_type
    - target_category_uid
    - target_class_uid

  # 推荐字段
  recommended:
    - tenant_id
    - environment
    - datacenter

  # 可选字段
  optional:
    - asset_group
    - priority
    - tags

# OCSF 目标类别参考
ocsf_categories:
  1: "System Activity"
  2: "Alert"
  3: "Audit"
  4: "Network Activity"
  5: "Application Activity"

ocsf_classes:
  2001: "Network Activity"
  2002: "File Activity"
  2003: "User Activity"
  3001: "Security Alert"
  3002: "System Alert"
```

### 3.4 metadata 注入点

**注入位置：** Kafka 消息 Header

```json
{
  "headers": {
    "vendor_name": "paloalto",
    "product_name": "pan-os",
    "device_type": "firewall",
    "target_category_uid": 4,
    "target_class_uid": 2001,
    "tenant_id": "tenant-001",
    "environment": "prod",
    "datasource_id": "ds-firewall-01"
  },
  "body": "<原始日志>"
}
```

### 3.5 UI 强制要求

**数据源配置表单必须包含：**

| 字段 | 验证规则 | 错误提示 |
|------|----------|----------|
| vendor_name | 非空，字母数字下划线 | "厂商名称不能为空" |
| product_name | 非空 | "产品名称不能为空" |
| device_type | 必须在允许列表中 | "请选择正确的设备类型" |
| target_category_uid | 必须是有效 OCSF UID | "请选择 OCSF 类别" |
| tenant_id | MSSP 模式下必填 | "租户 ID 不能为空" |
| environment | 必须是 prod/dev/test | "请选择环境" |

---

## 4. Anti-Features（明确不做的功能）

| Anti-Feature | Why Avoid | What To Do Instead |
|--------------|-----------|---------------------|
| S3/OSS + MQ 云存储事件触发 | 私有化部署无 S3，违反约束 | Kafka Topic 订阅代替 |
| 云厂商专属 SDK（如 AWS CloudTrail SDK） | 私有化部署不支持 | REST API 轮询代替 |
| 全球全渠道自动发现 | 复杂度爆炸，运维不可控 | 用户手动声明式配置 |
| 自动背压到所有采集源 | 可能导致采集源雪崩 | 仅对 HTTP 源做背压 |
| 实时采集延迟 < 100ms | 私有化环境网络不稳定，追求低延迟不现实 | < 5s 延迟可接受 |
| 自动 metadata 推断作为唯一来源 | LLM 推断可能出错，必须有人工确认 | 人工配置为主，AI 辅助校验 |

---

## 5. 功能依赖关系

```
[全局元数据体系]
      │
      │ metadata 是所有渠道的强制输入
      ▼
[多渠道采集后端]
      │
      │ 采集事件 + metadata 统一进入 Kafka
      ▼
[采集可观测性 + DLQ]
      │
      │ 监控指标基于 Kafka 事件统计
      │ DLQ 事件携带完整 metadata
      ▼
[现有 Flink Parser Pipeline] → [ES/Neo4j/MinIO]
```

**构建顺序建议：**

| 阶段 | 任务 | 原因 |
|------|------|------|
| Phase 1 | 全局元数据 Schema + UI 强制验证 | 所有渠道依赖 metadata |
| Phase 2 | Webhook 接收网关 + Kafka Writer | 最简单的新渠道，快速验证 |
| Phase 3 | Kafka Consumer 订阅 | 扩展现有 Kafka 基础设施 |
| Phase 4 | REST API / DB 轮询调度器 | 复杂状态管理，最后做 |
| Phase 5 | DLQ 机制 | 依赖解析层，可独立验证 |
| Phase 6 | 监控指标 + 告警 | 依赖所有渠道运行数据 |
| Phase 7 | 背压机制 | 高复杂度，最后做 |

---

## 6. MVP 推荐

**最小可行产品功能集：**

1. **全局元数据 Schema**（必做）
   - vendor_name/product_name/device_type 必填验证
   - OCSF target category/class 下拉选择
   - tenant_id/environment 标签

2. **Webhook 接收网关**（最简单新渠道）
   - HTTP POST endpoint
   - Header secret 鉴权
   - 事件写入 Kafka + metadata header

3. **Kafka Consumer 订阅**（复用现有）
   - 新 consumer group 订阅外部 Topic
   - metadata 从配置注入

4. **DLQ 基础版**（必做）
   - 解析失败事件写入 dlq-events Topic
   - 3 次重试 + 告警

5. **基础监控**（必做）
   - EPS 计数
   - parse_success_rate
   - datasource_health 告警

**不放入 MVP：** 背压机制、自适应采集速率、DLQ 自动重试、metadata AI 推断

---

## 7. 复杂度评估汇总

| Feature | Complexity | Risk | Reason |
|---------|------------|------|--------|
| Kafka Consumer 订阅 | Medium | Low | 复用现有 Kafka client |
| Webhook 接收网关 | Low | Low | 标准 HTTP endpoint |
| REST API 轮询 | Medium | Medium | 状态管理复杂（翻页、光标、限流） |
| 数据库 JDBC 轮询 | Medium | Low | JDBC 标准化，光标字段用户配置 |
| DLQ 机制 | Medium | Medium | 需要重试逻辑和告警 |
| EPS/延迟监控 | Low | Low | 简单计数统计 |
| 背压机制 | High | High | 反馈控制环复杂，可能震荡 |
| 全局 metadata 强制 | Low | Low | UI 验证 + Kafka header 注入 |
| metadata AI 推断 | High | Medium | LLM 推断不确定，需人工确认 |

---

## 8. 参考来源

| 领域 | 来源 | 置信度 |
|------|------|--------|
| 多渠道采集架构 | `docs/多源异构安全日志采集最佳实践调研.md` | HIGH |
| Kafka Consumer | Confluent Kafka 文档 | HIGH |
| DLQ 模式 | 行业标准（Cribl, Vector, Logstash 最佳实践） | MEDIUM |
| OCSF 标准 | OCSF Schema GitHub (ocsf/ocsf-schema) | HIGH |
| 背压机制 | Reactive Streams Backpressure 模式 | MEDIUM |

**注意：** 由于外部搜索工具受限，部分分析基于现有系统架构和最佳实践文档推断，建议后续通过 PoC 验证轮询调度器的状态管理复杂性。

---

## 9. 验证清单

- [x] 表干功能 vs 差异化功能区分清晰
- [x] 所有新功能标注了复杂度
- [x] 依赖关系和构建顺序明确
- [x] anti-features 明确列出
- [x] 与现有系统（Vector/Kafka/Flink）集成点标注
- [x] MVP 范围明确
- [x] 元数据 Schema 完整
