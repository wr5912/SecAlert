# ARCHITECTURE.md - v1.5 多渠道采集后端与可观测性架构

**项目:** SecAlert v1.5 多源异构安全日志采集优化
**研究日期:** 2026-04-02
**研究类型:** 项目架构 - v1.5 新功能集成
**置信度:** MEDIUM (基于现有架构理解和业界最佳实践)

---

## Executive Summary

v1.5 在 v1.0/v1.1 已验证的三层解析架构基础上，新增**多渠道采集后端**、**可观测性监控体系**、**全局元数据标签**三大能力。本文档分析各新功能与现有架构的集成点，识别数据流变更、组件边界变化、以及跨功能依赖关系。

**关键结论:**
- 多渠道采集：在现有 Kafka Buffer 层之前新增 Ingester Service，作为统一采集网关
- DLQ/Monitoring：复用 Kafka 分区作为 DLQ，新增独立 Monitoring Service
- 全局元数据：在 Parser 输入端强制注入 Metadata Enricher，确保 OCSF 格式合规
- 构建顺序：元数据体系 → 采集网关 → DLQ/Monitoring

---

## 1. 现有架构回顾

### 1.1 当前组件拓扑

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          COLLECTION LAYER (现状)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Vector (统一采集)                                                │   │
│  │  - YAML 配置 (文件监控、Syslog 接收)                               │   │
│  │  - 直接输出到 Kafka                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ Kafka (raw-events)
┌─────────────────────────────────────────────────────────────────────────┐
│                         STREAM PROCESSING LAYER                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Kafka Consumer → 三层解析引擎                                     │   │
│  │  - 第一层: 预置模板匹配                                            │   │
│  │  - 第二层: Drain 聚类                                              │   │
│  │  - 第三层: DSPy + Qwen3-32B LLM                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Elasticsearch│  │ ClickHouse │  │   Neo4j    │  │   MinIO    │         │
│  │  全文检索   │  │  聚合分析   │  │  攻击链    │  │  原始日志  │         │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 v1.0/v1.1 数据流

```
[异构安全设备] → Vector → Kafka (raw-events) → Flink Parser
                                                       │
                                                       ↓
                              ┌────────────────────────────────────────┐
                              │              三层解析引擎                    │
                              │  模板匹配 → Drain聚类 → DSPy/LLM          │
                              └─────────────────┼──────────────────────┘
                                                ↓
                              ┌────────────────────────────────────────┐
                              │              输出路径                       │
                              │  ES (索引)  ←→  Neo4j (图)  ←→  MinIO   │
                              └────────────────────────────────────────┘
```

---

## 2. v1.5 新功能集成点分析

### 2.1 多渠道采集后端 (Multi-Channel Ingestion Backend)

**目标:** 支持 Kafka Topic 订阅、Webhook 接收、REST API 轮询、数据库轮询四种新渠道

#### 2.1.1 集成点识别

| 组件 | v1.0/v1.1 状态 | v1.5 变更 | 变更类型 |
|------|---------------|----------|---------|
| **Vector Config** | 仅文件/Syslog | 新增 Kafka Consumer / Webhook / Poller 配置 | MODIFY |
| **Kafka Input** | 仅作为 Output | 支持订阅外部 Kafka Topic | NEW |
| **Webhook Gateway** | 无 | 新增 HTTP Webhook 接收服务 | NEW |
| **Poller Service** | 无 | REST API / Database 定时轮询 | NEW |
| **Ingestion Manager** | 无 | 统一管理采集任务生命周期 | NEW |

#### 2.1.2 数据流扩展

```
v1.0 数据流:
[设备日志] → Vector → Kafka (raw-events) → Flink Parser

v1.5 数据流 (新增渠道):
[Kafka Topic] → Kafka Consumer → ┐
[Webhook]    → Webhook Gateway  →┤
[REST API]   → REST Poller     →├→ [统一采集通道] → Kafka (raw-events) → Flink Parser
[Database]   → DB Poller       →┘
                                     │
                                     ↓
                              ┌────────────────────────────────────────┐
                              │         新增: Metadata Enricher         │
                              │         (强制注入全局元数据标签)           │
                              └────────────────────────────────────────┘
```

#### 2.1.3 新增组件架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INGESTION GATEWAY SERVICE (新增)                      │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ Kafka Consumer  │  │ Webhook Gateway │  │   Poller Service        │ │
│  │                 │  │                 │  │                         │ │
│  │ - Topic 订阅    │  │ - HTTP POST     │  │ - REST API 轮询         │ │
│  │ - Consumer Group│  │ - Header 鉴权   │  │ - JDBC 数据库轮询        │ │
│  │ - Offset 管理   │  │ - IP 白名单     │  │ - 增量游标追踪          │ │
│  │ - 消息反序列化   │  │ - 请求验证      │  │ - 限流重试策略          │ │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘ │
│           │                    │                       │               │
│           └────────────────────┼───────────────────────┘               │
│                                ↓                                          │
│                    ┌─────────────────────────┐                          │
│                    │   Ingestion Manager     │                          │
│                    │   - 任务注册/注销        │                          │
│                    │   - 生命周期管理         │                          │
│                    │   - 渠道健康检查        │                          │
│                    └───────────┬─────────────┘                          │
│                                ↓                                          │
│                    ┌─────────────────────────┐                          │
│                    │  Metadata Enricher      │  ← 全局元数据强制注入      │
│                    │  - vendor_name          │                          │
│                    │  - product_name          │                          │
│                    │  - device_type           │                          │
│                    │  - OCSF target           │                          │
│                    │  - tenant_id             │                          │
│                    │  - environment           │                          │
│                    └───────────┬─────────────┘                          │
│                                ↓                                          │
│                    ┌─────────────────────────┐                          │
│                    │   Kafka Producer       │                          │
│                    │   → raw-events Topic    │                          │
│                    └─────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.1.4 渠道配置数据模型

```python
# src/api/ingestion_models.py 新增

from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

class IngestionChannelType(str, Enum):
    KAFKA = "kafka"           # Kafka Topic 订阅
    WEBHOOK = "webhook"       # Webhook 接收
    REST_API = "rest_api"     # REST API 轮询
    DATABASE = "database"      # 数据库轮询

class KafkaSourceConfig(BaseModel):
    """Kafka Topic 订阅配置"""
    brokers: list[str] = Field(..., description="Kafka Broker 地址")
    topic: str = Field(..., description="要订阅的 Topic")
    consumer_group: str = Field(..., description="Consumer Group ID")
    security_protocol: Literal["PLAINTEXT", "SASL_PLAINTEXT", "SSL"] = "PLAINTEXT"
    sasl_mechanism: Optional[str] = None
    auto_offset_reset: Literal["earliest", "latest"] = "earliest"

class WebhookSourceConfig(BaseModel):
    """Webhook 接收配置"""
    path: str = Field(..., description="Webhook 接收路径，如 /webhook/security-events")
    ip_whitelist: list[str] = Field(default_factory=list, description="IP 白名单")
    header_secret: Optional[str] = Field(None, description="Header Secret 鉴权")
    max_body_size: int = Field(10 * 1024 * 1024, description="最大请求体 10MB")

class RestPollerConfig(BaseModel):
    """REST API 轮询配置"""
    url: str = Field(..., description="API URL")
    method: Literal["GET", "POST"] = "GET"
    auth_type: Literal["none", "bearer", "basic", "api_key"] = "none"
    auth_token: Optional[str] = None
    headers: dict[str, str] = Field(default_factory=dict)
    poll_interval_seconds: int = Field(60, ge=10, description="轮询间隔，最小 10 秒")
    rate_limit_backoff: int = Field(300, description="遇到限流后的退避秒数")
    cursor_field: Optional[str] = Field(None, description="增量游标字段名")
    time_format: str = Field("iso8601", description="时间戳格式")

class DatabasePollerConfig(BaseModel):
    """数据库轮询配置"""
    jdbc_url: str = Field(..., description="JDBC 连接 URL")
    username: str
    password: str
    sql_query: str = Field(..., description="轮询 SQL，必须包含 WHERE clause")
    cursor_column: str = Field(..., description="递增游标列，如 id 或 timestamp")
    poll_interval_seconds: int = Field(60, ge=10)
    batch_size: int = Field(1000, description="每次轮询最大行数")

class IngestionSource(BaseModel):
    """采集数据源配置"""
    source_id: str = Field(..., description="数据源唯一标识")
    source_name: str = Field(..., description="数据源显示名称")
    channel_type: IngestionChannelType

    # 渠道特定配置 (discriminated union)
    config: KafkaSourceConfig | WebhookSourceConfig | RestPollerConfig | DatabasePollerConfig

    # 全局元数据 (强制)
    vendor_name: str = Field(..., description="厂商名，如 crowdstrike")
    product_name: str = Field(..., description="产品名，如 falcon")
    device_type: str = Field(..., description="设备类型，如 firewall, edr, router")
    ocsf_category_uid: int = Field(..., description="OCSF 目标类别 UID")
    ocsf_class_uid: int = Field(..., description="OCSF 目标事件类 UID")
    tenant_id: str = Field(..., description="租户标识")
    environment: Literal["prod", "dev", "test"] = "prod"

    enabled: bool = True
```

---

### 2.2 DLQ 与可观测性监控 (DLQ / Monitoring)

**目标:** 解析失败的日志不丢失、EPS 监控、采集延迟告警、背压机制

#### 2.2.1 集成点识别

| 组件 | v1.0/v1.1 状态 | v1.5 变更 | 变更类型 |
|------|---------------|----------|---------|
| **DLQ Topic** | 无 | 新增 `raw-events-dlq` Kafka Topic | NEW |
| **DLQ Consumer** | 无 | 死信日志存储和告警 | NEW |
| **EPS Monitor** | 无 | 新增 metrics endpoint 和告警规则 | NEW |
| **Backpressure Handler** | 无 | 基于 Kafka 消费积压的背压 | NEW |
| **Collection Lag Monitor** | 无 | 采集延迟计算和告警 | NEW |

#### 2.2.2 DLQ 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DLQ (Dead Letter Queue) 架构                          │
│                                                                         │
│  [采集通道] → Kafka (raw-events) → Flink Parser                         │
│                    │                              │                      │
│                    │                              ↓                      │
│                    │              ┌─────────────────────────┐           │
│                    │              │   Parser Failure       │           │
│                    │              │   - 格式解析失败         │           │
│                    │              │   - 字段提取异常         │           │
│                    │              │   - LLM 调用超时        │           │
│                    │              └───────────┬─────────────┘           │
│                    │                          ↓                          │
│                    │              ┌─────────────────────────┐           │
│                    │              │   DLQ Router            │           │
│                    │              │   - 保留原始日志        │           │
│                    │              │   - 添加错误原因标签    │           │
│                    │              │   - 添加时间戳          │           │
│                    │              └───────────┬─────────────┘           │
│                    │                          ↓                          │
│                    │              ┌─────────────────────────┐           │
│                    │              │ Kafka DLQ Topic         │           │
│                    │              │ raw-events-dlq          │           │
│                    │              └───────────┬─────────────┘           │
│                    │                          ↓                          │
│                    │              ┌─────────────────────────┐           │
│                    └──────────────→│   DLQ Consumer         │           │
│                                       │   - MinIO 归档存储    │           │
│                                       │   - 告警通知          │           │
│                                       │   - 重试队列 (可选)   │           │
│                                       └─────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2.3 DLQ 消息格式

```python
# src/models/dlq_message.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DLQMessage(BaseModel):
    """DLQ 死信消息格式"""
    dlq_id: str = Field(..., description="唯一标识 UUID")
    source_id: str = Field(..., description="来源数据源 ID")
    source_name: str = Field(..., description="来源数据源名称")
    raw_message: str = Field(..., description="原始日志全文")
    error_reason: str = Field(..., description="失败原因")
    error_stage: Literal["deserialization", "template_match", "drain_cluster", "llm_parse", "enrichment"] = Field(
        ..., description="失败阶段"
    )
    error_detail: Optional[str] = Field(None, description="详细错误信息")
    retry_count: int = Field(0, description="已重试次数")
    max_retries: int = Field(3, description="最大重试次数")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="入 DLQ 时间")
    metadata: dict = Field(default_factory=dict, description="原始元数据")

    # 全局元数据 (保留)
    vendor_name: str
    product_name: str
    device_type: str
    tenant_id: str
    environment: str
```

#### 2.2.4 监控指标设计

```python
# src/monitoring/metrics.py

from prometheus_client import Counter, Histogram, Gauge

# EPS 监控
ingestion_events_total = Counter(
    'ingestion_events_total',
    '总采集事件数',
    ['source_id', 'channel_type', 'status']  # status: success, failed, dlq
)

ingestion_events_per_second = Gauge(
    'ingestion_eps',
    '当前 EPS (每秒事件数)',
    ['source_id']
)

# 采集延迟监控
ingestion_lag_seconds = Histogram(
    'ingestion_lag_seconds',
    '采集延迟 (从日志时间戳到入 Kafka 时间)',
    ['source_id'],
    buckets=[1, 5, 10, 30, 60, 120, 300]
)

# 消费积压监控
kafka_consumer_lag = Gauge(
    'kafka_consumer_lag',
    'Kafka 消费积压消息数',
    ['topic', 'consumer_group']
)

# DLQ 指标
dlq_messages_total = Counter(
    'dlq_messages_total',
    'DLQ 消息总数',
    ['source_id', 'error_stage']
)

dlq_message_age_hours = Histogram(
    'dlq_message_age_hours',
    'DLQ 消息滞留时长',
    buckets=[1, 6, 12, 24, 48, 72, 168]
)

# 背压指标
backpressure_active = Gauge(
    'backpressure_active',
    '是否触发背压',
    ['source_id']  # 1 = 背压中, 0 = 正常
)

ingestion_rejection_total = Counter(
    'ingestion_rejection_total',
    '因背压被拒绝的事件数',
    ['source_id']
)
```

#### 2.2.5 背压机制设计

```
背压触发条件:
- Kafka consumer lag > 10000 条
- 内存使用率 > 80%
- LLM 调用队列 > 100

背压响应:
1. HTTP 429 Too Many Requests → Webhook 发送方降速
2. 暂停 REST Poller 轮询
3. 暂停 Database Poller 轮询
4. Kafka Consumer 降低消费速率

背压恢复:
- lag < 5000 条
- 内存 < 70%
- 自动逐步恢复
```

---

### 2.3 全局元数据体系 (Global Metadata System)

**目标:** 强制注入 vendor_name / product_name / device_type + OCSF target + tenant_id / environment

#### 2.3.1 集成点识别

| 组件 | v1.0/v1.1 状态 | v1.5 变更 | 变更类型 |
|------|---------------|----------|---------|
| **Metadata Enricher** | 无 | 在 Parser 之前强制注入元数据 | NEW |
| **Template Metadata** | 硬编码 | 支持运行时配置覆盖 | MODIFY |
| **OCSF Mapper** | 基础支持 | 完整 OCSF 字段映射 | MODIFY |
| **Multi-Tenant Isolation** | 无 | tenant_id 强制隔离 | NEW |

#### 2.3.2 元数据注入流程

```
[原始日志]
     │
     ↓
┌─────────────────────────┐
│   Metadata Enricher    │ ← 在 Ingestion Gateway 内执行
│                         │
│   1. 从 IngestionSource │
│      配置获取元数据       │
│                         │
│   2. 强制覆盖原始日志    │
│      中的 vendor/product│
│                         │
│   3. OCSF 目标类别映射  │
│                         │
│   4. 租户/环境标签      │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│    enriched_event       │
│   {                     │
│     raw_log: "...",     │
│     vendor_name: "...", │
│     product_name: "...",│
│     device_type: "...", │
│     ocsf_category_uid,  │
│     ocsf_class_uid,     │
│     tenant_id,          │
│     environment,        │
│     ingest_timestamp    │
│   }                     │
└───────────┬─────────────┘
            ↓
      Kafka (raw-events)
            │
            ↓
      Flink Parser
```

#### 2.3.3 OCSF 目标映射

```python
# src/ocsf/mapper.py

from typing import Literal

class OCSFMapper:
    """OCSF 标准格式映射器"""

    # 常见设备类型 → OCSF 类别映射表
    DEVICE_TYPE_TO_CATEGORY = {
        "firewall": 1,       # Network Activity
        "waf": 1,
        "ids": 1,
        "ips": 1,
        "edr": 2,             # Detective Control / Alert
        "antivirus": 2,
        "endpoint": 2,
        "siem": 2,
        "casb": 3,            # Cloud Activity
        "cwpp": 3,
        "cloudtrail": 3,
        "vulnerability_scanner": 4,  # Vulnerability
        "db_audit": 5,        # Audit Event
        "ldap": 5,
        "dhcp": 6,            # Entity (Authentication)
        "dns": 6,
    }

    # 常见设备类型 → OCSF 类映射表
    DEVICE_TYPE_TO_CLASS = {
        "firewall": 4001,     # Network Activity
        "waf": 4001,
        "ids": 2001,          # Alert
        "ips": 2001,
        "edr": 2001,
        "antivirus": 2003,    # File Activity
        "endpoint": 2003,
    }

    @classmethod
    def map_device_type(
        cls,
        device_type: str,
        ocsf_category_uid: int = None,
        ocsf_class_uid: int = None
    ) -> tuple[int, int]:
        """映射设备类型到 OCSF 类别和类"""
        category = ocsf_category_uid or cls.DEVICE_TYPE_TO_CATEGORY.get(
            device_type.lower(), 1
        )
        class_uid = ocsf_class_uid or cls.DEVICE_TYPE_TO_CLASS.get(
            device_type.lower(), 4001
        )
        return category, class_uid
```

---

## 3. 新增组件 vs 修改组件清单

### 3.1 多渠道采集后端

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| IngestionManager | NEW | 采集任务生命周期管理 | 被 API 调用 |
| KafkaConsumerService | NEW | 订阅外部 Kafka Topic | 依赖 kafka-python |
| WebhookGateway | NEW | HTTP Webhook 接收服务 | 依赖 FastAPI |
| RestPollerService | NEW | REST API 定时轮询 | 依赖 httpx |
| DatabasePollerService | NEW | 数据库定时轮询 | 依赖 JDBC |
| MetadataEnricher | NEW | 全局元数据强制注入 | 被所有渠道调用 |
| VectorConfigHotReload | MODIFY | 支持运行时配置变更 | 依赖 Vector |

### 3.2 DLQ 与可观测性

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| DLQRouter | NEW | 解析失败消息路由到 DLQ | 被 Parser 调用 |
| DLQConsumerService | NEW | DLQ 消息处理和归档 | 依赖 MinIO |
| EPSMonitor | NEW | EPS 指标收集和告警 | 依赖 Prometheus |
| LagMonitor | NEW | 采集延迟监控 | 依赖 Kafka metrics |
| BackpressureHandler | NEW | 背压触发和恢复 | 被 IngestionManager 调用 |
| MonitoringEndpoints | NEW | /metrics 和 /health 端点 | 依赖 prometheus_client |

### 3.3 全局元数据体系

| 组件 | 类型 | 职责 | 依赖关系 |
|------|------|------|---------|
| OCSFMapper | NEW | OCSF 标准映射 | 被 MetadataEnricher 调用 |
| TenantIsolation | NEW | 多租户数据隔离 | 被所有存储操作调用 |
| MetadataValidator | NEW | 元数据完整性校验 | 被 IngestionSource API 调用 |

---

## 4. API 端点设计

### 4.1 采集源管理 API

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/ingestion/sources` | GET | 获取所有采集源配置 |
| `/api/ingestion/sources` | POST | 创建新采集源 |
| `/api/ingestion/sources/{id}` | GET | 获取指定采集源 |
| `/api/ingestion/sources/{id}` | PUT | 更新采集源配置 |
| `/api/ingestion/sources/{id}` | DELETE | 删除采集源 |
| `/api/ingestion/sources/{id}/enable` | POST | 启用采集源 |
| `/api/ingestion/sources/{id}/disable` | POST | 停用采集源 |
| `/api/ingestion/sources/{id}/test` | POST | 测试连接 |

### 4.2 监控 API

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/monitoring/metrics` | GET | Prometheus 格式指标 |
| `/api/monitoring/health` | GET | 健康状态检查 |
| `/api/monitoring/eps` | GET | 各数据源 EPS |
| `/api/monitoring/lag` | GET | 采集延迟统计 |
| `/api/monitoring/dlq` | GET | DLQ 消息列表 |
| `/api/monitoring/dlq/{id}/retry` | POST | 重试 DLQ 消息 |

---

## 5. 数据流汇总

### 5.1 v1.5 完整数据流

```
[异构安全设备 × N]
        │
        ├─────────────────────────────────────────────────────────────┐
        │                                                              │
        ↓                                                              ↓
┌───────────────────────┐                           ┌───────────────────────┐
│ Vector (本地采集)      │                           │ 外部 Kafka Topic      │
│ - 文件监控             │                           │ (安全设备托管服务)     │
│ - Syslog (514)        │                           └──────────┬──────────┘
└───────────┬───────────┘                                      │
            │                                                   ↓
            │                                    ┌───────────────────────────┐
            │                                    │ KafkaConsumerService      │
            │                                    │ - Topic 订阅              │
            │                                    │ - Consumer Group         │
            │                                    │ - Offset 管理             │
            │                                    └───────────┬───────────────┘
            │                                                │
            ↓                                                │
┌───────────────────────┐                                    │
│ Webhook Gateway       │                                    │
│ - HTTP POST 接收       │                                    │
│ - Header 鉴权         │                                    │
│ - IP 白名单           │                                    │
└───────────┬───────────┘                                    │
            │                                                 │
            ↓                                                 │
┌───────────────────────┐                                    │
│ REST Poller Service   │                                    │
│ - 定时轮询 REST API    │                                    │
│ - 增量游标追踪        │                                    │
│ - 限流重试策略        │                                    │
└───────────┬───────────┘                                    │
            │                                                 │
            ↓                                                 │
┌───────────────────────┐                                    │
│ DB Poller Service     │                                    │
│ - JDBC 定时轮询        │                                    │
│ - 递增游标字段        │                                    │
└───────────┬───────────┘                                    │
            │                                                 │
            └─────────────┬───────────────────────────────────┘
                          ↓
            ┌───────────────────────────┐
            │   Ingestion Manager      │
            │   - 任务注册/注销         │
            │   - 健康检查              │
            │   - 生命周期管理          │
            └───────────┬───────────────┘
                        ↓
            ┌───────────────────────────┐
            │   Metadata Enricher      │ ← 全局元数据强制注入
            │   - vendor_name           │
            │   - product_name          │
            │   - device_type           │
            │   - OCSF category/class   │
            │   - tenant_id             │
            │   - environment           │
            └───────────┬───────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                         Kafka (raw-events)                                │
│                         消息格式: EnrichedEvent                            │
└───────────────────────────────────────────────────────────────────────────┘
                        │
                        ├──────────────────────────────┐
                        ↓                              ↓
            ┌───────────────────────┐        ┌───────────────────────┐
            │ Flink Parser          │        │ DLQ Router             │
            │ - 模板匹配            │        │ (解析失败时触发)       │
            │ - Drain 聚类          │        │                        │
            │ - DSPy/LLM 解析       │        │ → Kafka DLQ Topic     │
            └───────────┬───────────┘        └───────────────────────┘
                        │                              │
                        ↓                              ↓
            ┌───────────────────────┐        ┌───────────────────────┐
            │ Storage               │        │ DLQ Consumer          │
            │ - ES (索引)           │        │ - MinIO 归档           │
            │ - Neo4j (图)          │        │ - 告警通知            │
            │ - MinIO (原始)        │        │ - 可选重试            │
            └───────────────────────┘        └───────────────────────┘
```

---

## 6. 构建顺序建议

| 阶段 | 组件 | 原因 |
|------|------|------|
| **Phase 1** | 全局元数据体系 (MetadataEnricher, OCSFMapper) | 所有采集渠道依赖元数据注入 |
| **Phase 2** | Webhook Gateway + REST Poller | 简单的推送/拉取模式验证 |
| **Phase 3** | Kafka Consumer Service + Database Poller | 较复杂的渠道接入 |
| **Phase 4** | DLQ Router + DLQ Consumer | 依赖 Parser 失败场景 |
| **Phase 5** | Monitoring (EPS, Lag, Backpressure) | 依赖采集通道运行 |
| **Phase 6** | Ingestion Manager 整合 | 统一管理所有渠道生命周期 |

---

## 7. 风险与注意事项

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **Kafka Topic 订阅复杂度** | Medium | 先实现单 Consumer Group，验证后再扩展 |
| **Webhook 顺序保证** | Low | Webhook 无顺序要求，但需考虑幂等性 |
| **REST Poller 限流处理** | Medium | 实现指数退避，配置项可调 |
| **DLQ 消息堆积** | Medium | 监控 DLQ depth，设置告警阈值 |
| **背压导致数据积压** | High | 优先实现监控告警，手动背压控制 |

### 7.2 非技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **多租户数据泄露** | High | tenant_id 强制校验，存储层隔离 |
| **合规审计日志缺失** | Medium | 所有采集操作写入审计日志 |

---

## 8. 验证清单

- [x] 多渠道采集与现有 Vector 采集共存
- [x] DLQ 死信队列设计覆盖所有解析失败场景
- [x] 全局元数据在 Parser 之前强制注入
- [x] 背压机制保护后端不被冲垮
- [x] EPS/Lag 监控指标完整
- [x] 多租户 tenant_id 隔离
- [x] 构建顺序考虑组件依赖

---

## 9. 参考资料

- 现有架构: `.planning/research/ARCHITECTURE.md` (v1.1)
- 多源采集最佳实践: `docs/多源异构安全日志采集最佳实践调研.md`
- Phase 15 研究: `.planning/phases/15-data-ingestion-enhancement/15-RESEARCH.md`
- Kafka DLQ 模式: 业界标准 Dead Letter Queue 模式
- OCSF 规范: Open Cybersecurity Schema Framework

---

**置信度评估:**

| 领域 | 置信度 | 备注 |
|------|--------|------|
| 多渠道采集架构 | MEDIUM | 基于现有 Kafka 架构扩展，渠道模式成熟 |
| DLQ/Monitoring | MEDIUM | 标准 Prometheus + Kafka metrics 方案 |
| 全局元数据体系 | HIGH | OCSF 规范清晰，项目已有基础 |
| 构建顺序 | MEDIUM | 依赖分析合理，实际实施可能需要调整 |
