# Technology Stack: SecAlert v1.5 Multi-Channel Ingestion

**项目:** SecAlert v1.5 多源异构安全日志采集优化
**研究日期:** 2026-04-02
**研究模式:** Stack Addition Research
**Confidence:** MEDIUM-HIGH

---

## 执行摘要

v1.5 需要在现有 Vector + Kafka 采集架构基础上，新增多渠道接入后端（Kafka Topic 订阅、Webhook 接收、REST/DB 轮询）、DLQ 死信队列、采集监控体系。

**核心结论：现有技术栈已覆盖大部分需求，只需引入 1 个新库（prometheus-client），其余通过设计模式实现。**

---

## 现有技术栈评估

| 组件 | 当前版本 | v1.5 需求 | 状态 |
|------|---------|----------|------|
| Python | 3.10+ | 3.10+ | ✅ 兼容 |
| FastAPI | >=0.100.0 | Webhook 接收网关 | ✅ 已有 |
| confluent-kafka | 2.13.2 | Kafka Consumer/Producer | ✅ 已有 |
| httpx | >=0.24.0 | REST API 轮询 | ✅ 已有 |
| SQLAlchemy | (via psycopg2) | 数据库轮询 | ✅ 已有 |
| APScheduler | >=3.10.0 | 定时任务 | ✅ 已有 |
| schedule | (在 jdbc_poller 用) | 简单定时 | ✅ 已有 |
| redis | >=5.0.0 | 游标状态存储 | ✅ 已有 |

---

## 推荐新增技术栈

### 1. 可观测性 / 监控指标

| 技术 | 版本 | 用途 | 理由 |
|------|------|------|------|
| **prometheus-client** | >=0.19.0 | 采集管道指标暴露 | 私有化部署无云依赖，Prometheus 是标准选择；相比 OpenTelemetry 更轻量，适合离线环境 |

**为什么不用 OpenTelemetry？**
- OpenTelemetry 功能更全面但学习曲线陡峭、配置复杂
- 私有化离线部署场景下，Prometheus + Grafana 是更务实的选择
- 国产化环境有适配需求（如 华为云 CES、腾讯云 TCM），可后续扩展

**集成方式（FastAPI + Prometheus）：**

```python
# src/collection/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter, Response

# 定义采集管道指标
COLLECTION_EPS = Counter(
    'secalert_collection_eps_total',
    'Total events collected',
    ['source_type', 'channel']  # channel: kafka/webhook/rest/db
)

COLLECTION_LAG = Histogram(
    'secalert_collection_lag_seconds',
    'Collection lag in seconds',
    ['channel']
)

DLQ_MESSAGES = Counter(
    'secalert_dlq_messages_total',
    'Messages sent to DLQ',
    ['reason', 'channel']
)

ACTIVE_SOURCES = Gauge(
    'secalert_active_sources',
    'Number of active collection sources',
    ['channel']
)

router = APIRouter()

@router.get("/metrics/collection")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

---

## 渠道接入技术方案

### 2. Kafka Topic 订阅（增强现有消费者）

**现状：** `src/chain/kafka_consumer.py` 使用 `confluent-kafka.Consumer`
**v1.5 需求：** 支持多 Consumer Group、多 Topic、DLQ 吐出

```python
# src/collection/kafka_consumer.py (新增)
from confluent_kafka import Consumer, Producer, KafkaError
import json

class MultiTopicConsumer:
    """多 Topic 订阅消费者"""

    def __init__(self, config: dict):
        self.consumer = Consumer({
            'bootstrap.servers': config['bootstrap_servers'],
            'group.id': config['group_id'],
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': True,
            # 新增：错误回调
            'error_cb': self._error_callback,
        })
        self.dlq_producer = Producer({'bootstrap.servers': config['bootstrap_servers']})
        self.dlq_topic = config.get('dlq_topic', 'secalert-dlq-raw')

    def _error_callback(self, err):
        """Kafka 错误回调"""
        if err.fatal():
            # 致命错误，记录并可能需要重启 consumer
            pass

    def send_to_dlq(self, message, reason: str):
        """发送失败消息到 DLQ"""
        from datetime import datetime
        dlq_event = {
            'original_topic': message.topic(),
            'original_partition': message.partition(),
            'original_offset': message.offset(),
            'error_reason': reason,
            'timestamp': datetime.utcnow().isoformat(),
            'payload': message.value().decode('utf-8', errors='replace')
        }
        self.dlq_producer.produce(
            self.dlq_topic,
            key=message.key(),
            value=json.dumps(dlq_event).encode('utf-8')
        )
        self.dlq_producer.flush()
```

**无需新库：** confluent-kafka 2.13.2 已支持所有所需功能。

---

### 3. Webhook 接收网关

**技术：** FastAPI 已有，依赖 `python-multipart`

```bash
# 已安装（FastAPI 依赖）
pip install python-multipart
```

```python
# src/collection/webhook.py
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import hmac, hashlib
import json

class WebhookPayload(BaseModel):
    """Webhook 载荷模型"""
    data: dict
    timestamp: Optional[str] = None

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """验证 Webhook 签名 (HMAC-SHA256)"""
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.post("/api/ingest/webhook/{source_id}")
async def receive_webhook(
    source_id: str,
    background_tasks: BackgroundTasks,
    x_signature: Optional[str] = Header(None),
    body: bytes = None,  # 原始 body 用于签名验证
):
    # 1. 签名验证（如果配置了 secret）
    source_config = get_source_config(source_id)
    if source_config.get('webhook_secret'):
        if not verify_signature(body, x_signature, source_config['webhook_secret']):
            raise HTTPException(status_code=401, detail="Invalid signature")

    # 2. 解析 payload
    payload = json.loads(body)

    # 3. 异步发送到 Kafka（不阻塞响应）
    background_tasks.add_task(send_to_kafka, source_id, payload)

    return {"status": "accepted"}
```

**无需新库：** FastAPI + python-multipart 足够。

---

### 4. REST API 定时轮询

**技术：** httpx (已有) + APScheduler (已有)

```python
# src/collection/rest_poller.py
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

class RestPoller:
    """REST API 轮询器"""

    def __init__(self, config: dict):
        self.url = config['url']
        self.auth = self._setup_auth(config)
        self.poll_interval = config.get('poll_interval_seconds', 60)
        self.last_cursor = None
        self.client = httpx.AsyncClient(timeout=30.0)
        self.source_id = config['source_id']

    def _setup_auth(self, config: dict):
        """设置认证信息"""
        auth_type = config.get('auth_type', 'none')
        if auth_type == 'bearer':
            return {'Authorization': f"Bearer {config['auth_token']}"}
        elif auth_type == 'api_key':
            return {'X-API-Key': config['api_key']}
        return {}

    def _build_params(self) -> dict:
        """构建请求参数，包含游标"""
        params = {}
        if self.last_cursor:
            # 根据 API 类型构建翻页参数
            if 'cursor_field' in self.poll_config:
                params[self.poll_config['cursor_field']] = self.last_cursor
            elif 'since_field' in self.poll_config:
                params[self.poll_config['since_field']] = self.last_cursor
        return params

    async def poll(self):
        """执行一次轮询"""
        params = self._build_params()

        try:
            response = await self.client.get(
                self.url,
                headers=self.auth,
                params=params
            )
            response.raise_for_status()
            events = response.json()

            # 提取事件列表（根据 API 响应格式）
            events = self._extract_events(events)

            # 发送到 Kafka
            for event in events:
                await self._send_to_kafka(event)

            # 更新游标
            self.last_cursor = self._extract_cursor(events)

            # 更新指标
            COLLECTION_EPS.labels(source_type='rest', channel='rest').inc(len(events))

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                # 限流：使用 Retry-After 头
                retry_after = int(e.response.headers.get('Retry-After', 60))
                # 调整下次执行时间
            COLLECTION_LAG.labels(channel='rest').observe(time.time() - start_time)
        except Exception as e:
            logger.error(f"REST polling failed: {e}")
            DLQ_MESSAGES.labels(reason='poll_error', channel='rest').inc()
```

**无需新库：** httpx + APScheduler 已覆盖。

---

### 5. 数据库定时轮询

**技术：** 已有 `collector/polling/jdbc_poller.py`，可增强

**建议增强点：**
- 增量游标支持更通用（时间戳 + ID 组合）
- Redis 存储游标状态（利用已有 redis 依赖）
- 统一指标埋点

---

## DLQ 设计模式

### Kafka DLQ Topic 架构

```
正常流程:
  raw-events → Parser → parsed-events

DLQ 流程:
  Parser 解析失败 → dlq-raw-events (保留原始消息)
  解析失败元数据 → dlq-metadata (包含解析错误原因)
```

**DLQ Topic 命名规范：**
| Topic | 用途 |
|-------|------|
| `secalert-dlq-raw` | 原始解析失败消息 |
| `secalert-dlq-metadata` | 解析失败的元数据（错误原因、尝试次数） |

**DLQ 消费者需求：**
- 人工审核界面（查看 DLQ 消息）
- 重试机制（可配置重试次数）
- 告警（DLQ 堆积超过阈值）

---

## 全局元数据注入

**这不是新库，是数据流设计要求。**

所有渠道采集的消息必须在最早入口处注入元数据：

```python
# src/collection/metadata.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CollectionMetadata(BaseModel):
    """采集元数据（强制字段）"""
    vendor_name: str           # 厂商名
    product_name: str          # 产品名
    device_type: str           # 设备类型
    target_category_uid: Optional[str] = None   # OCSF 目标类别
    target_class_uid: Optional[str] = None     # OCSF 事件类
    tenant_id: Optional[str] = None            # 多租户标识
    environment: Optional[str] = None          # 环境
    zone: Optional[str] = None                  # 可用区
    collector_id: str                            # 采集器实例 ID
    ingest_timestamp: str                       # 摄取时间 (ISO 8601)

def inject_metadata(event: dict, source_config: dict, collector_id: str) -> dict:
    """在采集入口注入全局元数据"""
    metadata = CollectionMetadata(
        vendor_name=source_config['vendor_name'],
        product_name=source_config['product_name'],
        device_type=source_config['device_type'],
        target_category_uid=source_config.get('target_category_uid'),
        target_class_uid=source_config.get('target_class_uid'),
        tenant_id=source_config.get('tenant_id'),
        environment=source_config.get('environment'),
        zone=source_config.get('zone'),
        collector_id=collector_id,
        ingest_timestamp=datetime.utcnow().isoformat(),
    )
    event['_collection_metadata'] = metadata.model_dump()
    return event
```

**注入时机：**
- Kafka Consumer：消费消息后立即注入
- Webhook Receiver：接收时立即注入
- REST/DB Poller：轮询返回后立即注入

---

## 依赖汇总

### 需新增的依赖

| 库 | 版本 | 用途 | pyproject.toml 位置 |
|----|------|------|---------------------|
| prometheus-client | >=0.19.0 | 采集管道监控指标 | 新增 `monitoring` 分组 |

```toml
# pyproject.toml 新增
monitoring = [
    "prometheus-client>=0.19.0",
]
```

### 已有但需确认的依赖

| 库 | 用途 | pyproject.toml 位置 |
|----|------|---------------------|
| confluent-kafka==2.13.2 | Kafka 客户端 | parser |
| httpx>=0.24.0 | HTTP 客户端 | chain |
| APScheduler>=3.10.0 | 定时任务 | reporting |
| python-multipart | FastAPI 表单解析 | FastAPI 自动依赖 |
| redis>=5.0.0 | 游标状态存储 | parser |

### 可选依赖（建议暂不加）

| 库 | 替代方案 | 暂不加理由 |
|----|---------|-----------|
| structlog | 现有 logging | 增加学习成本，当前足够 |
| opentelemetry-api | prometheus-client | 离线环境 Prometheus 更简单 |
| aiokafka | confluent-kafka | confluent-kafka 已支持异步模式 |

---

## 不建议添加的技术

| 技术 | 原因 |
|------|------|
| Kafka Connect | 过度工程，现有 Python consumer 足够 |
| Flink | 处理量级（3万/天）不需要实时流处理 |
| Pulsar | Confluent Kafka 7.5.0 足够 |
| RabbitMQ | 已有 Kafka，无需双消息队列 |
| AWS SDK / Azure SDK | 私有化离线部署无云依赖 |

---

## 国产化数据库支持

v1.5 采集后端需要支持轮询国产数据库：

| 数据库 | SQLAlchemy 连接串格式 | 驱动需求 |
|-------|---------------------|---------|
| 达梦 (DM) | `dm+dmPython://user:pass@host:5236/db` | 需安装 dmPython |
| openGauss | `postgresql+psycopg2://user:pass@host:5432/db` | 已有 psycopg2 |
| Kingbase | `kingbase+psycopg2://user:pass@host:54321/db` | 需安装对应驱动 |
| TiDB | `mysql+pymysql://user:pass@host:4000/db` | 需安装 pymysql |

**建议：** 数据库轮询使用 SQLAlchemy 2.0+，可适配多种数据库。

---

## 集成点清单

| 组件 | 集成位置 | 说明 |
|------|---------|------|
| Prometheus Metrics | 新建 `src/collection/metrics.py` | 新增 `/metrics/collection` 端点 |
| Kafka Consumer | 新建 `src/collection/kafka_consumer.py` | 增强支持多 Topic 和 DLQ |
| Webhook Receiver | 新建 `src/collection/webhook.py` | FastAPI 新端点 `/api/ingest/webhook/{source_id}` |
| REST Poller | 新建 `src/collection/rest_poller.py` | httpx + APScheduler |
| JDBC Poller | 已有 `collector/polling/jdbc_poller.py` | 增强游标和错误处理 |
| Metadata Injector | 新建 `src/collection/metadata.py` | 统一元数据注入 |

---

## Confidence Assessment

| 领域 | Confidence | 说明 |
|------|------------|------|
| prometheus-client 选择 | HIGH | 事实标准，私有化部署首选 |
| confluent-kafka DLQ 模式 | HIGH | 已有库完整支持 |
| Webhook 方案 | HIGH | FastAPI 原生支持 |
| REST Polling 方案 | MEDIUM-HIGH | httpx + APScheduler 成熟 |
| 国产数据库支持 | MEDIUM | 需要实际环境验证驱动兼容性 |

---

## 参考来源

- [confluent-kafka-python GitHub](https://github.com/confluentinc/confluent-kafka-python) - 官方 Kafka Python 客户端
- [Prometheus Python Client](https://github.com/prometheus/client_python) - 官方 Prometheus Python 库
- [HTTPX 文档](https://www.python-httpx.org/) - 异步 HTTP 客户端
- [FastAPI Webhook 最佳实践](https://fastapi.tiangolo.com/tutorial/request-forms/) - Webhook 接收模式

**验证状态:** 部分基于 2026 年训练数据 + 现有架构分析。建议在正式选型前验证最新版本。
