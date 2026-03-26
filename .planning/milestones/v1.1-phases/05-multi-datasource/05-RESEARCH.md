# Phase 5: 多数据源支持 - Research

**研究日期:** 2026-03-25
**Domain:** 多数据源接入架构
**Confidence:** MEDIUM (基于 Vector 官方文档 + 项目现有架构分析)

---

## Executive Summary

Phase 5 需要为 SecAlert 增加多数据源接入能力，支持 SSH Syslog、Windows Event Log、SNMP Trap、API 轮询、JDBC 数据库五种数据源。核心挑战在于 Vector 对 Windows Event Log、SNMP Trap、JDBC 没有原生支持，需要引入第三方组件或自研解决方案。

**关键发现:**
- **Syslog**: Vector 原生支持，配置成熟
- **Windows Event Log**: 需通过 Windows Agent (nxlog/winlogbeat) 转发为 Syslog
- **SNMP Trap**: 需通过 snmptrapd 中转为 Syslog
- **API 轮询**: Vector http_client 满足需求
- **JDBC**: 需自研 Python 轮询脚本或使用 Flink JDBC Connector

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 私有化离线部署，无外部云依赖
- 所有 AI 推理基于私有化 Qwen3-32B
- 使用 Vector 作为统一采集框架

### Claude's Discretion
- 数据源具体实现方式
- 健康检查机制设计

### Deferred Ideas (OUT OF SCOPE)
- 云安全设备集成 (Phase 6+)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-01 | 支持SSH Syslog数据源接入 | Vector syslog source 已验证 |
| DS-02 | 支持Windows Event Log数据源 | 需要 Windows Agent 转发方案 |
| DS-03 | 支持SNMP Trap数据源 | 需要 snmptrapd 中转方案 |
| DS-04 | 支持API轮询数据源（HTTP/HTTPS） | Vector http_client source 已验证 |
| DS-05 | 支持数据库JDBC数据源 | 需要自研 Python 轮询或 Flink |
| DS-06 | 数据源健康状态监控与告警 | 需设计健康检查机制 |

---

## Standard Stack

### Core Collection

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vector | 0.37+ | 统一数据采集框架 | 事实标准的开源采集器，支持多协议 |
| snmptrapd | Net-SNMP | SNMP Trap 接收 | Linux 标准 SNMP Trap 守护进程 |
| nxlog/winlogbeat | 3.x / 8.x | Windows Event Log 采集 | Windows Syslog 转发的事实标准 |
| SQLAlchemy | 2.0+ | JDBC 连接池管理 | Python 事实标准的 DB 连接库 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| schedule | 1.2+ | 定时任务调度 | Python JDBC 轮询脚本 |
| confluent-kafka | 2.3+ | Kafka 生产者 | 数据源到 Kafka 的写入 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nxlog | winlogbeat | winlogbeat 更轻量但功能较少 |
| snmptrapd | SNMPTT | SNMPTT 支持更复杂的转换规则 |
| 自研 JDBC 轮询 | Flink JDBC Connector | Flink 更适合流处理，但部署复杂 |

---

## Architecture Patterns

### Recommended Project Structure

```
collector/
├── configs/
│   ├── vector-syslog.yaml        # SSH Syslog 源配置
│   ├── vector-http-polling.yaml  # API 轮询源配置
│   ├── vector-kafka-sink.yaml   # Kafka 输出配置
│   └── sources/
│       ├── ssh_syslog/           # Syslog 源配置
│       ├── windows_events/       # Windows Event 源配置
│       ├── snmp_traps/           # SNMP Trap 源配置
│       └── api_polling/          # API 轮询源配置
├── agents/
│   ├── windows/                  # Windows Agent 配置
│   │   └── nxlog.conf
│   └── snmp/
│       └── snmptrapd.conf
└── polling/
    └── jdbc_poller.py            # JDBC 数据库轮询脚本

parser/templates/
├── syslog/                       # Syslog 解析模板
│   ├── cisco_asa.yaml
│   ├── fortinet_fortigate.yaml
│   └── paloalto_panos.yaml
├── windows/                      # Windows Event 模板
│   └── security.yaml
├── snmp/                         # SNMP Trap 模板
│   └── generic_trap.yaml
└── api/                          # API 轮询解析模板
    └── generic_json.yaml
```

### Pattern 1: Vector Syslog Source (DS-01)

**What:** Vector 接收 Syslog 事件并转发到 Kafka

**When to use:** 防火墙、IDS/IPS、路由器等网络设备

**Example:**
```yaml
# collector/configs/sources/syslog/cisco_asa.yaml
sources:
  cisco_asa_syslog:
    type: syslog
    address: "0.0.0.0:514"
    mode: tcp
    framing:
      method: lines
    max_frame_size: 65536
    receive_buffer_bytes: 262144

transforms:
  add_source_metadata:
    type: add_fields
    inputs:
      - cisco_asa_syslog
    fields:
      source_type: cisco_asa
      source_name: cisco-asa-01
```

**Source:** [Vector Syslog Source Documentation](https://vector.dev/docs/reference/configuration/sources/syslog/)

### Pattern 2: Windows Event Log Collection (DS-02)

**What:** Windows Agent 收集事件并转发为 Syslog 到 Vector

**When to use:** Windows 服务器、工作站

**Architecture:**
```
[Windows Event Log] → nxlog/winlogbeat → [Syslog] → Vector → Kafka
```

**Example (nxlog.conf):**
```conf
<Input eventlog_security>
    Module      im_msvistalog
    Query       <QueryList><Query Id="0"><Select Path="Security">*</Select></Query></QueryList>
</Input>

<Output syslog>
    Module      om_tcp
    Host        10.0.0.100
    Port        514
    Exec        to_syslog_snare();
</Output>
```

**Source:** [nxlog Documentation](https://nxlog.co/documentation/)

### Pattern 3: SNMP Trap Collection (DS-03)

**What:** snmptrapd 接收 SNMP Trap 并转发为 Syslog 到 Vector

**When to use:** 网络设备、打印机、UPS 等支持 SNMP 的设备

**Architecture:**
```
[SNMP Trap] → snmptrapd → [Syslog] → Vector → Kafka
```

**Example (snmptrapd.conf):**
```conf
authCommunity log,execute,net public
forward default public 10.0.0.100:514

# 格式转换
traphandle default /usr/bin/snmptthandler
```

**Note:** Vector 0.37+ 没有原生 SNMP Trap Source，需要通过 snmptrapd 中转

### Pattern 4: HTTP API Polling (DS-04)

**What:** Vector http_client source 轮询 HTTP/HTTPS API

**When to use:** 云安全服务、第三方威胁情报 API

**Example:**
```yaml
# collector/configs/sources/api_polling/threat_intel.yaml
sources:
  threat_intel_api:
    type: http_client
    endpoint: "https://api.example.com/alerts"
    method: GET
    scrape_interval_secs: 300
    auth:
      strategy: bearer
      token: "${THREAT_INTEL_API_TOKEN}"
    headers:
      Accept: "application/json"
```

**Source:** [Vector HTTP Client Source Documentation](https://vector.dev/docs/reference/configuration/sources/http_client/)

### Pattern 5: JDBC Database Polling (DS-05)

**What:** Python 脚本轮询数据库并发送到 Kafka

**When to use:** 数据库审计日志、SIEM 集成

**Example:**
```python
# collector/polling/jdbc_poller.py
import schedule
import time
from sqlalchemy import create_engine
from confluent_kafka import Producer

class JdbcPoller:
    """JDBC 数据库轮询器"""

    def __init__(self, connection_url: str, query: str, kafka_topic: str):
        self.engine = create_engine(connection_url)
        self.query = query
        self.producer = Producer({"bootstrap.servers": "localhost:9092"})
        self.last_id = 0

    def poll(self):
        """执行轮询并发送新记录到 Kafka"""
        with self.engine.connect() as conn:
            result = conn.execute(
                text(f"{self.query} WHERE id > {self.last_id} ORDER BY id")
            )
            for row in result:
                self.producer.produce(self.kafka_topic, str(row))
                self.last_id = max(self.last_id, row.id)

    def run(self, interval_seconds: int = 60):
        schedule.every(interval_seconds).seconds.do(self.poll)
        while True:
            schedule.run_pending()
            time.sleep(1)
```

### Pattern 6: Data Source Health Monitoring (DS-06)

**What:** 健康检查端点监控各数据源状态

**When to use:** 所有数据源

**Example:**
```python
# api/health.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/api/health", tags=["health"])

class DataSourceHealth(BaseModel):
    source_type: str
    source_name: str
    status: str  # healthy | degraded | down
    last_event_time: datetime
    events_per_minute: float
    error_count: int

@router.get("/sources", response_model=List[DataSourceHealth])
async def get_all_source_health():
    """获取所有数据源健康状态"""
    # 从 Kafka consumer lag、Vector metrics、Last event time 计算
    ...

@router.get("/sources/{source_name}")
async def get_source_health(source_name: str):
    """获取单个数据源健康状态"""
    ...
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syslog 接收 | 自研 UDP/TCP 服务器 | Vector syslog source | 支持 RFC 5424/3164，自动解析 |
| API 轮询 | 自研调度 + HTTP 客户端 | Vector http_client | 内置重试、认证、缓冲 |
| Windows Event 收集 | 自研 Windows Service | nxlog/winlogbeat | Windows 原生，稳定可靠 |
| JDBC 连接池 | 自研连接管理 | SQLAlchemy | 连接复用、断线重连、事务管理 |
| SNMP Trap 接收 | 自研 SNMP 栈 | snmptrapd | RFC 协议栈完整，生态成熟 |

**Key insight:** Vector 是私有化部署场景的事实标准采集器，社区活跃，文档完善。自研采集器维护成本高，不如集成现有方案。

---

## Common Pitfalls

### Pitfall 1: Syslog 数据丢失 (UDP Mode)

**What goes wrong:** UDP 模式下高流量时数据丢失

**Why it happens:** UDP 无连接、无确认机制，缓冲区满时丢包

**How to avoid:**
- 生产环境使用 TCP mode
- 配置合理的 `receive_buffer_bytes` (建议 256KB+)
- 监控 `receiver_errors` metric

**Warning signs:**
```
vector_system_receive_errors_total 增加
kafka_consumer_lag 持续增长
```

### Pitfall 2: Windows Event Log 权限问题

**What goes wrong:** nxlog 无法读取 Security 日志

**Why it happens:** Windows Event Log 需要管理员权限或特殊配置

**How to avoid:**
- 使用 Local Service 账户并授予读取权限
- 或使用 Domain Admin 账户通过 GPO 部署
- 验证: `wevtutil gl Security` 检查权限

### Pitfall 3: SNMP Trap 格式不统一

**What goes wrong:** 不同厂商的 SNMP Trap 格式差异大，解析失败

**Why it happens:** SNMP MIB 未统一，Trap 内容各异

**How to avoid:**
- 使用 SNMPTT 进行格式转换
- 为每种设备创建 MIB 映射规则
- 保留原始 Trap 供 DSPy LLM 兜底解析

### Pitfall 4: JDBC 轮询导致数据库负载

**What goes wrong:** 频繁轮询导致数据库 CPU/IO 升高

**Why it happens:** 没有增量字段索引，每次全表扫描

**How to avoid:**
- 必须有递增 ID 或时间戳字段
- 使用 ID > last_max_id 条件
- 合理设置轮询间隔 (30s-300s)

### Pitfall 5: API 轮询频率过高

**What goes wrong:** API 被限流或封禁

**Why it happens:** 轮询间隔太短，触发 API 限制

**How to avoid:**
- 遵循 API Rate Limit headers
- 默认间隔至少 60 秒
- 实现指数退避重试

---

## Runtime State Inventory

> Skip - Phase 5 does not involve rename/refactor/migration operations.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vector | 所有数据源采集 | 需安装 | 0.37+ | Docker 容器 |
| Python 3.10+ | JDBC 轮询脚本 | 需安装 | 3.10+ | — |
| SQLAlchemy | JDBC 连接池 | 需安装 | 2.0+ | psycopg2 (PostgreSQL 专用) |
| snmptrapd | SNMP Trap 接收 | 需安装 | Net-SNMP | SNMPTT |
| nxlog/winlogbeat | Windows Event | 需安装 | 3.x/8.x | Windows Event Forwarding |

**Missing dependencies with no fallback:**
- Vector: 必须安装，这是采集核心组件
- snmptrapd: 用于 SNMP Trap 接收，无替代方案

**Missing dependencies with fallback:**
- Python JDBC 轮询脚本: 可以使用 Flink JDBC Connector 替代

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Config file | pytest.ini (如存在) |
| Quick run command | `pytest tests/ -x -v` |
| Full suite command | `pytest tests/ -v --tb=short` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DS-01 | Vector Syslog 源配置生成 | unit | `pytest tests/test_collector.py::test_syslog_source_config -x` | 需创建 |
| DS-02 | Windows Event 解析模板 | unit | `pytest tests/test_parser.py::test_windows_event_template -x` | 需创建 |
| DS-03 | SNMP Trap 解析模板 | unit | `pytest tests/test_parser.py::test_snmp_trap_template -x` | 需创建 |
| DS-04 | Vector HTTP Client 配置 | unit | `pytest tests/test_collector.py::test_http_client_config -x` | 需创建 |
| DS-05 | JDBC 轮询脚本 | unit | `pytest tests/test_polling.py::test_jdbc_poller -x` | 需创建 |
| DS-06 | 健康检查 API | unit | `pytest tests/test_api.py::test_health_api -x` | 需创建 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_collector/ tests/test_parser/ -x`
- **Per wave merge:** Full test suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_collector/` - Vector 配置生成测试
- [ ] `tests/test_parser/test_windows_event.py` - Windows Event 解析测试
- [ ] `tests/test_parser/test_snmp_trap.py` - SNMP Trap 解析测试
- [ ] `tests/test_polling/test_jdbc_poller.py` - JDBC 轮询测试
- [ ] `tests/test_api/test_health_api.py` - 健康检查 API 测试
- [ ] `tests/conftest.py` - 添加数据源 fixtures

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单一 Syslog 源 | 多源 Vector 配置 | Phase 5 | 支持更多设备类型 |
| 手动脚本轮询 | Vector http_client | Phase 5 | 更好的重试和缓冲 |
| 无健康检查 | 健康检查 API | Phase 5 | 可观测性提升 |

**Deprecated/outdated:**
- **snmptrapd 文本模式**: 改用 snmptrapd + SNMPTT 转换

---

## Open Questions

1. **Windows Event Log 转发协议选择**
   - What we know: nxlog 支持 TCP/UDP Syslog 转发
   - What's unclear: 是否有更简单的方案 (如 Windows Event Forwarding)
   - Recommendation: 优先使用 nxlog TCP 模式，稳定可靠

2. **JDBC 轮询 vs Flink JDBC Connector**
   - What we know: Flink 有原生 JDBC Connector
   - What's unclear: Flink 部署复杂度 vs 维护成本
   - Recommendation: Phase 5 先用 Python 脚本快速实现，后续评估是否迁移到 Flink

3. **SNMP Trap MIB 映射**
   - What we know: 不同厂商 Trap 格式差异大
   - What's unclear: 需要支持哪些厂商的 MIB
   - Recommendation: Phase 5 只实现通用 Trap 解析，厂商特定规则后续迭代

---

## Sources

### Primary (HIGH confidence)
- [Vector Syslog Source](https://vector.dev/docs/reference/configuration/sources/syslog/) - 官方配置文档
- [Vector HTTP Client Source](https://vector.dev/docs/reference/configuration/sources/http_client/) - API 轮询配置
- [Vector Configuration Reference](https://vector.dev/docs/reference/configuration/) - 向量配置总览

### Secondary (MEDIUM confidence)
- [nxlog Documentation](https://nxlog.co/documentation/) - Windows Event Log 收集
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/) - JDBC 连接池管理
- [Net-SNMP snmptrapd](http://www.net-snmp.org/) - SNMP Trap 接收

### Tertiary (LOW confidence)
- 各种博客和社区文章关于 SNMP Trap + ELK 集成 - 需验证实际部署效果

---

## Metadata

**Confidence breakdown:**
- Vector Syslog 配置: HIGH - 官方文档明确
- Vector HTTP Client: HIGH - 官方文档明确
- Windows Event Log 方案: MEDIUM - 业界方案，但实际部署需验证
- SNMP Trap 方案: MEDIUM - 理论可行，缺乏实际案例验证
- JDBC 轮询: MEDIUM - 自研方案，需测试稳定性

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days, 技术栈相对稳定)
