---
phase: 05-multi-datasource
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - collector/configs/vector-syslog.yaml
  - collector/configs/sources/syslog/
  - collector/configs/vector-http-polling.yaml
  - collector/configs/sources/api_polling/
  - collector/polling/jdbc_poller.py
  - api/health.py
autonomous: true
requirements:
  - DS-01
  - DS-02
  - DS-03
  - DS-04
  - DS-05
  - DS-06

must_haves:
  truths:
    - "用户可以通过Vector Syslog源接收SSH设备告警"
    - "用户可以通过Windows Agent转发接收Windows Event Log"
    - "用户可以通过snmptrapd中转接收SNMP Trap"
    - "用户可以配置Vector HTTP Client轮询API数据源"
    - "用户可以通过JDBC轮询脚本采集数据库告警"
    - "用户可以通过API查看所有数据源健康状态"
  artifacts:
    - path: "collector/configs/vector-syslog.yaml"
      provides: "Vector Syslog源配置"
      min_lines: 20
    - path: "collector/configs/vector-http-polling.yaml"
      provides: "Vector HTTP Client API轮询配置"
      min_lines: 15
    - path: "collector/polling/jdbc_poller.py"
      provides: "JDBC数据库轮询脚本"
      min_lines: 80
    - path: "api/health.py"
      provides: "数据源健康检查API"
      exports: ["GET /api/health/sources"]
    - path: "collector/configs/sources/windows_events/nxlog.conf"
      provides: "Windows Event Log转发配置"
      min_lines: 15
    - path: "collector/configs/sources/snmp_traps/snmptrapd.conf"
      provides: "SNMP Trap中转配置"
      min_lines: 10
  key_links:
    - from: "collector/configs/vector-syslog.yaml"
      to: "collector/configs/sources/syslog/"
      via: "inputs引用"
      pattern: "inputs:.*syslog"
    - from: "collector/configs/vector-http-polling.yaml"
      to: "collector/polling/jdbc_poller.py"
      via: "Kafka topic"
      pattern: "kafka_topic.*raw-events"
---

<objective>
实现多数据源接入能力，支持Syslog、Windows Event Log、SNMP Trap、API轮询、JDBC五种数据源，并提供统一的数据源健康检查API。
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/research/ARCHITECTURE.md
@.planning/phases/05-multi-datasource/05-RESEARCH.md

# 数据源架构模式 (来自 RESEARCH.md)

## DS-01: Vector Syslog Source
```yaml
sources:
  cisco_asa_syslog:
    type: syslog
    address: "0.0.0.0:514"
    mode: tcp
    framing:
      method: lines
```

## DS-02: Windows Event Log (通过nxlog转发)
```
[Windows Event Log] → nxlog → [Syslog] → Vector → Kafka
```

## DS-03: SNMP Trap (通过snmptrapd中转)
```
[SNMP Trap] → snmptrapd → [Syslog] → Vector → Kafka
```

## DS-04: Vector HTTP Client
```yaml
sources:
  api_polling:
    type: http_client
    endpoint: "https://api.example.com/alerts"
    scrape_interval_secs: 300
```

## DS-05: JDBC Poller (Python)
```python
class JdbcPoller:
    def poll(self):
        # 轮询数据库并发送到Kafka
```

## DS-06: Health Check API
```python
class DataSourceHealth(BaseModel):
    source_type: str
    source_name: str
    status: str
    last_event_time: datetime
    events_per_minute: float
    error_count: int
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: 实现SSH Syslog数据源接入 (DS-01)</name>
  <files>collector/configs/vector-syslog.yaml, collector/configs/sources/syslog/</files>
  <read_first>
    - collector/configs/vector.yaml (现有Vector配置)
    - collector/configs/sources/ (现有source配置)
  </read_first>
  <action>
## DS-01: SSH Syslog数据源接入

创建 `collector/configs/vector-syslog.yaml`:

```yaml
# Vector Syslog源配置
# 支持 RFC 5424/3164，TCP模式避免UDP丢包
sources:
  ssh_syslog_tcp:
    type: syslog
    address: "0.0.0.0:514"
    mode: tcp
    framing:
      method: lines
    max_frame_size: 65536
    receive_buffer_bytes: 262144

  ssh_syslog_udp:
    type: syslog
    address: "0.0.0.0:5140"
    mode: udp
    framing:
      method: octet_counting
    receive_buffer_bytes: 262144

transforms:
  add_syslog_metadata:
    type: add_fields
    inputs:
      - ssh_syslog_tcp
      - ssh_syslog_udp
    fields:
      source_type: ssh_syslog
      collector: vector
      protocol: syslog

sinks:
  to_kafka:
    type: kafka
    inputs:
      - add_syslog_metadata
    bootstrap_servers: "${KAFKA_BOOTSTRAP_SERVERS}"
    topic: raw-events
    encoding:
      codec: json
```

在 `collector/configs/sources/syslog/` 创建示例配置:
- `cisco_asa.yaml` - Cisco ASA防火墙
- `fortinet_fortigate.yaml` - Fortinet FortiGate
- `paloalto_panos.yaml` - Palo Alto PAN-OS
- `generic.yaml` - 通用Syslog设备

**关键点:**
- TCP模式 (port 514) 用于生产环境
- UDP模式 (port 5140) 用于兼容性
- 256KB receive_buffer_bytes 避免高流量丢包
- source_type 字段用于后续解析路由
  </action>
  <verify>
    <automated>grep -l "type: syslog" collector/configs/vector-syslog.yaml && grep -l "type: kafka" collector/configs/vector-syslog.yaml</automated>
  </verify>
  <done>Vector Syslog源配置完成，支持TCP/UDP双模式，可接收Syslog并转发到Kafka</done>
</task>

<task type="auto">
  <name>Task 2: 实现Windows Event Log数据源 (DS-02)</name>
  <files>collector/configs/sources/windows_events/nxlog.conf</files>
  <read_first>
    - collector/configs/vector-syslog.yaml (理解Vector Syslog接收)
    - 05-RESEARCH.md (Windows Event Log架构)
  </read_first>
  <action>
## DS-02: Windows Event Log数据源

Windows Event Log无法被Vector直接采集，需要通过nxlog/winlogbeat转发为Syslog。

创建 `collector/configs/sources/windows_events/nxlog.conf`:

```conf
# nxlog Windows Event Log转发配置
# 将Windows Security Event转发为Syslog到Vector

<Input security_events>
    Module      im_msvistalog
    Query       <QueryList>
                   <Query Id="0">
                     <Select Path="Security">*</Select>
                   </Query>
                   <Query Id="1">
                     <Select Path="System">*</Select>
                   </Query>
                 </QueryList>
    PollInterval 1
</Input>

<Input application_events>
    Module      im_msvistalog
    Query       <QueryList>
                   <Query Id="0">
                     <Select Path="Application">*</Select>
                   </Query>
                 </QueryList>
    PollInterval 5
</Input>

<Output to_syslog_tcp>
    Module      om_tcp
    Host        ${VECTOR_HOST:10.0.0.100}
    Port        514
    Exec        to_syslog_snare();
    Exec        $raw_event = "[" + now_str() + "] " + $raw_event;
</Output>

<Output to_syslog_udp>
    Module      om_udp
    Host        ${VECTOR_HOST:10.0.0.100}
    Port        5140
    Exec        to_syslog_snare();
</Output>

<Route security_to_tcp>
    Path        security_events => to_syslog_tcp
</Route>

<Route application_to_udp>
    Path        application_events => to_syslog_udp
</Route>
```

创建 `collector/configs/sources/windows_events/README.md`:

```markdown
# Windows Event Log 采集配置

## 架构
Windows Event Log → nxlog → Syslog → Vector → Kafka

## 部署步骤

1. 下载 nxlog Community Edition:
   https://nxlog.co/products/nxlog-ce-community-edition/download

2. 配置 nxlog.conf:
   - 修改 Host 为 Vector 服务器地址
   - 根据需要调整 Query 过滤规则

3. 启动 nxlog 服务:
   sc start nxlog

## 支持的 Windows 版本
- Windows Server 2012 R2+
- Windows 10/11 Enterprise

## 权限要求
- 读取 Security 日志需要管理员权限
- 读取 Application/System 日志需要 Local Service 或更高权限
```

**关键点:**
- Security日志使用TCP确保可靠性
- Application日志使用UDP降低资源消耗
- $raw_event前缀添加时间戳便于调试
  </action>
  <verify>
    <automated>grep -l "im_msvistalog" collector/configs/sources/windows_events/nxlog.conf && grep -l "om_tcp" collector/configs/sources/windows_events/nxlog.conf</automated>
  </verify>
  <done>Windows Event Log转发配置完成，nxlog将Windows事件转发为Syslog到Vector</done>
</task>

<task type="auto">
  <name>Task 3: 实现SNMP Trap数据源 (DS-03)</name>
  <files>collector/configs/sources/snmp_traps/snmptrapd.conf</files>
  <read_first>
    - collector/configs/vector-syslog.yaml (理解Vector Syslog接收)
    - 05-RESEARCH.md (SNMP Trap架构)
  </read_first>
  <action>
## DS-03: SNMP Trap数据源

SNMP Trap无法被Vector直接采集，需要通过snmptrapd中转为Syslog。

创建 `collector/configs/sources/snmp_traps/snmptrapd.conf`:

```conf
# snmptrapd SNMP Trap中转配置
# 将SNMP Trap转换为Syslog并转发到Vector

# 禁用SNMPv1重试(可能导致重复告警)
doNotRetain SNMPv1

# 接受所有Trap(生产环境应限制)
authCommunity log,execute,net public

# 转发所有Trap到Vector(TCP确保可靠)
forward default public@${VECTOR_HOST:-10.0.0.100}:514

# 启动文本模式处理(便于调试和通用解析)
traphandle default /usr/bin/snmptthandler

# 自定义处理脚本(可选，用于格式转换)
# traphandle SNMPv2-MIB::coldStart /usr/local/bin/handle_trap.sh
```

创建 `collector/configs/sources/snmp_traps/snmptrapd.service`:

```ini
[Unit]
Description=SNMP Trap Daemon
After=network.target

[Service]
Type=notify
ExecStart=/usr/sbin/snmptrapd -f -Lo -C -c /etc/snmp/snmptrapd.conf udp:162
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

创建 `collector/configs/sources/snmp_traps/README.md`:

```markdown
# SNMP Trap 采集配置

## 架构
SNMP Trap → snmptrapd → Syslog → Vector → Kafka

## 部署步骤

1. 安装 Net-SNMP:
   apt-get install snmpd snmptrapd

2. 配置 snmptrapd.conf:
   - 修改 VECTOR_HOST 为实际Vector服务器地址

3. 启动服务:
   systemctl enable snmptrapd
   systemctl start snmptrapd

4. 配置防火墙放行UDP 162端口

## 支持的设备类型
- 网络设备 (Cisco, Juniper, HP)
- UPS设备 (APC, Eaton)
- 打印机
- 存储设备

## 已知限制
- 不同厂商的SNMP Trap格式差异大，需要厂商特定MIB
- Phase 5只实现通用Trap解析
  ```

**关键点:**
- TCP转发确保Trap不丢失
- 使用snmptthandler进行文本模式处理
- 社区名"public"用于开发环境，生产应更换
  </action>
  <verify>
    <automated>grep -l "snmptrapd" collector/configs/sources/snmp_traps/snmptrapd.conf && grep -l "forward default" collector/configs/sources/snmp_traps/snmptrapd.conf</automated>
  </verify>
  <done>SNMP Trap中转配置完成，snmptrapd将SNMP Trap转发为Syslog到Vector</done>
</task>

</tasks>

<tasks_2>

<task type="auto">
  <name>Task 4: 实现API轮询数据源 (DS-04)</name>
  <files>collector/configs/vector-http-polling.yaml, collector/configs/sources/api_polling/</files>
  <read_first>
    - collector/configs/vector-syslog.yaml (理解Vector配置结构)
    - 05-RESEARCH.md (HTTP Client配置)
  </read_first>
  <action>
## DS-04: API轮询数据源

使用Vector http_client source实现HTTP/HTTPS API轮询。

创建 `collector/configs/vector-http-polling.yaml`:

```yaml
# Vector HTTP Client API轮询配置
# 支持Bearer Token认证、重试机制、定时轮询

sources:
  # 通用HTTP轮询源模板
  http_polling_generic:
    type: http_client
    endpoint: "${API_ENDPOINT}"
    method: GET
    scrape_interval_secs: ${SCRAPE_INTERVAL:-300}
    auth:
      strategy: bearer
      token: "${API_TOKEN}"
    headers:
      Accept: "application/json"
      User-Agent: "SecAlert-Collector/1.0"
    timeout_secs: 30
    retry_on:
      max_retries: 3
      backoff_secs: 5
    decoder:
      type: json

transforms:
  normalize_http_event:
    type: remap
    inputs:
      - http_polling_generic
    source: |
      .source_type = "api_polling"
      .collector = "vector"
      .api_endpoint = getenv("API_ENDPOINT")
      .collected_at = now()

sinks:
  http_to_kafka:
    type: kafka
    inputs:
      - normalize_http_event
    bootstrap_servers: "${KAFKA_BOOTSTRAP_SERVERS}"
    topic: raw-events
    encoding:
      codec: json
```

在 `collector/configs/sources/api_polling/` 创建示例配置:

`threat_intel.yaml`:
```yaml
sources:
  threat_intel_api:
    type: http_client
    endpoint: "https://api.abuseipdb.com/api/v2/check-block"
    method: GET
    scrape_interval_secs: 3600
    auth:
      strategy: bearer
      token: "${ABUSEIPDB_API_KEY}"
    query:
      maximumNewAge: "30"
      ipVersion: "4"
    headers:
      Accept: "application/json"
```

`siem_integration.yaml`:
```yaml
sources:
  siem_alerts:
    type: http_client
    endpoint: "${SIEM_API_URL}/alerts"
    method: GET
    scrape_interval_secs: 60
    auth:
      strategy: basic
      password: "${SIEM_API_KEY}"
    headers:
      Accept: "application/json"
```

**关键点:**
- 使用环境变量配置敏感信息
- 默认300秒轮询间隔，可配置
- 内置重试机制(exponential backoff)
- 支持Bearer/Basic两种认证
  </action>
  <verify>
    <automated>grep -l "type: http_client" collector/configs/vector-http-polling.yaml && grep -l "type: kafka" collector/configs/vector-http-polling.yaml</automated>
  </verify>
  <done>API轮询数据源配置完成，Vector HTTP Client支持多种认证方式和定时轮询</done>
</task>

<task type="auto">
  <name>Task 5: 实现JDBC数据库数据源 (DS-05)</name>
  <files>collector/polling/jdbc_poller.py</files>
  <read_first>
    - collector/polling/ (现有轮询脚本目录)
    - 05-RESEARCH.md (JDBC轮询架构)
  </read_first>
  <action>
## DS-05: JDBC数据库数据源

Vector没有原生JDBC支持，创建Python轮询脚本使用SQLAlchemy连接数据库。

创建 `collector/polling/jdbc_poller.py`:

```python
#!/usr/bin/env python3
"""
JDBC数据库轮询脚本
用于采集数据库审计日志、安全告警等

依赖:
    pip install sqlalchemy schedule confluent-kafka pyyaml

用法:
    python jdbc_poller.py --config config.yaml
"""

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import schedule
import yaml
from confluent_kafka import Producer
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class JdbcPoller:
    """JDBC数据库轮询器

    支持:
    - 增量轮询 (基于递增ID或时间戳)
    - 多数据库类型 (PostgreSQL, MySQL, Oracle, SQL Server)
    - Kafka消息发送
    - 优雅退出
    """

    def __init__(
        self,
        connection_url: str,
        query: str,
        kafka_topic: str,
        kafka_bootstrap_servers: str,
        id_column: Optional[str] = None,
        timestamp_column: Optional[str] = None,
        poll_interval_seconds: int = 60
    ):
        """初始化JDBC轮询器

        Args:
            connection_url: SQLAlchemy连接URL
            query: SQL查询语句
            kafka_topic: Kafka目标topic
            kafka_bootstrap_servers: Kafka服务器地址
            id_column: 递增ID列名，用于增量轮询
            timestamp_column: 时间戳列名，用于增量轮询
            poll_interval_seconds: 轮询间隔(秒)
        """
        self.engine: Engine = create_engine(
            connection_url,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600
        )
        self.query = query
        self.kafka_topic = kafka_topic
        self.producer = Producer({
            "bootstrap.servers": kafka_bootstrap_servers,
            "acks": "all"
        })
        self.id_column = id_column
        self.timestamp_column = timestamp_column
        self.poll_interval = poll_interval_seconds

        # 增量轮询状态
        self._last_id: int = 0
        self._last_timestamp: Optional[datetime] = None

        # 优雅退出标志
        self._running = True

    def _build_incremental_query(self) -> str:
        """构建增量轮询SQL"""
        conditions = []

        if self.id_column and self._last_id > 0:
            conditions.append(f"{self.id_column} > {self._last_id}")

        if self.timestamp_column and self._last_timestamp:
            ts_str = self._last_timestamp.isoformat()
            conditions.append(f"{self.timestamp_column} > '{ts_str}'")

        if conditions:
            where_keyword = "WHERE" if "WHERE" not in self.query.upper() else "AND"
            return f"{self.query} {where_keyword} {' AND '.join(conditions)}"

        return self.query

    def _update_state(self, rows: List[Dict[str, Any]]) -> None:
        """更新增量轮询状态"""
        if not rows:
            return

        if self.id_column:
            ids = [row.get(self.id_column) for row in rows if row.get(self.id_column)]
            if ids:
                self._last_id = max(self._last_id, max(ids))

        if self.timestamp_column:
            timestamps = [
                row.get(self.timestamp_column)
                for row in rows
                if row.get(self.timestamp_column)
            ]
            if timestamps:
                self._last_timestamp = max(
                    self._last_timestamp or datetime.min.replace(tzinfo=timezone.utc),
                    max(timestamps)
                )

    def poll(self) -> int:
        """执行一次轮询

        Returns:
            采集的记录数
        """
        query = self._build_incremental_query()
        logger.info(f"Executing query: {query[:100]}...")

        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                rows = [dict(row._mapping) for row in result]

                for row in rows:
                    event = {
                        "source_type": "jdbc",
                        "collector": "jdbc_poller",
                        "database": str(self.engine.url.database),
                        "collected_at": datetime.now(timezone.utc).isoformat(),
                        "data": row
                    }
                    self.producer.produce(
                        self.kafka_topic,
                        json.dumps(event, default=str)
                    )

                self._update_state(rows)
                self.producer.flush()

                count = len(rows)
                if count > 0:
                    logger.info(f"Polled {count} rows")
                return count

        except Exception as e:
            logger.error(f"Poll error: {e}")
            raise

    def run(self) -> None:
        """启动轮询循环"""
        logger.info(f"Starting JDBC poller (interval: {self.poll_interval}s)")

        # 设置信号处理器实现优雅退出
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        # 立即执行一次
        self.poll()

        # 定时执行
        schedule.every(self.poll_interval).seconds.do(self.poll)

        while self._running:
            schedule.run_pending()
            time.sleep(1)

        logger.info("JDBC poller stopped")

    def _shutdown(self, signum, frame) -> None:
        """优雅退出"""
        logger.info(f"Received signal {signum}, shutting down...")
        self._running = False


def load_config(config_path: str) -> Dict[str, Any]:
    """从YAML文件加载配置"""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description='JDBC Database Poller')
    parser.add_argument(
        '--config',
        required=True,
        help='Configuration YAML file path'
    )
    args = parser.parse_args()

    config = load_config(args.config)

    poller = JdbcPoller(
        connection_url=os.environ['DATABASE_URL'],
        query=config['query'],
        kafka_topic=config['kafka_topic'],
        kafka_bootstrap_servers=os.environ.get(
            'KAFKA_BOOTSTRAP_SERVERS',
            'localhost:9092'
        ),
        id_column=config.get('id_column'),
        timestamp_column=config.get('timestamp_column'),
        poll_interval_seconds=config.get('poll_interval_seconds', 60)
    )

    poller.run()


if __name__ == '__main__':
    main()
```

创建 `collector/polling/jdbc_poller.service`:

```ini
[Unit]
Description=JDBC Database Poller
After=network.target kafka.service

[Service]
Type=simple
User=secalert
EnvironmentFile=/etc/secalert/jdbc_poller.env
ExecStart=/usr/bin/python3 /opt/secalert/collector/polling/jdbc_poller.py --config /etc/secalert/jdbc_poller.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

创建 `collector/configs/sources/jdbc/` 配置文件示例:

`siem_audit.yaml`:
```yaml
# SIEM数据库审计日志轮询
query: |
  SELECT event_id, timestamp, user_name, action, source_ip
  FROM audit_log
  WHERE event_type = 'security'
  ORDER BY event_id

kafka_topic: raw-events
id_column: event_id
poll_interval_seconds: 30
```

**关键点:**
- 使用SQLAlchemy连接池，避免频繁建连
- 支持ID或时间戳两种增量方式
- 信号处理实现优雅退出
- 记录last_id/timestamp状态实现断点续传
  </action>
  <verify>
    <automated>grep -l "class JdbcPoller" collector/polling/jdbc_poller.py && grep -l "schedule.every" collector/polling/jdbc_poller.py</automated>
  </verify>
  <done>JDBC数据库轮询脚本完成，支持多种数据库、增量轮询、Kafka发送</done>
</task>

<task type="auto">
  <name>Task 6: 实现数据源健康检查API (DS-06)</name>
  <files>api/health.py</files>
  <read_first>
    - api/ (现有API目录结构)
    - 05-RESEARCH.md (健康检查API设计)
  </read_first>
  <action>
## DS-06: 数据源健康状态监控与告警

创建健康检查API端点，监控所有数据源状态。

创建 `api/health.py`:

```python
"""
数据源健康检查API

提供 /api/health/sources 端点，返回所有数据源的健康状态
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/health", tags=["health"])


class DataSourceStatus(str, Enum):
    """数据源状态枚举"""
    HEALTHY = "healthy"      # 正常运行
    DEGRADED = "degraded"   # 降级运行(有错误但可工作)
    DOWN = "down"           # 完全不可用


class DataSourceHealth(BaseModel):
    """数据源健康状态模型"""
    source_type: str = Field(..., description="数据源类型: ssh_syslog, windows_event, snmp_trap, api_polling, jdbc")
    source_name: str = Field(..., description="数据源名称/标识")
    status: DataSourceStatus = Field(..., description="健康状态")
    last_event_time: Optional[datetime] = Field(None, description="最近事件时间")
    events_per_minute: float = Field(0.0, ge=0, description="每分钟事件数")
    error_count: int = Field(0, ge=0, description="累计错误数")
    error_message: Optional[str] = Field(None, description="最新错误信息")
    metadata: Dict[str, str] = Field(default_factory=dict, description="额外元数据")


class DataSourceRegistry:
    """数据源注册表

    维护所有数据源的状态信息
    """

    def __init__(self):
        self._sources: Dict[str, DataSourceHealth] = {}
        self._last_report_time: Dict[str, datetime] = {}

    def register(
        self,
        source_type: str,
        source_name: str,
        **metadata
    ) -> None:
        """注册数据源"""
        key = f"{source_type}:{source_name}"
        if key not in self._sources:
            self._sources[key] = DataSourceHealth(
                source_type=source_type,
                source_name=source_name,
                status=DataSourceStatus.HEALTHY,
                metadata=metadata
            )

    def update(
        self,
        source_name: str,
        last_event_time: Optional[datetime] = None,
        events_per_minute: Optional[float] = None,
        error_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> None:
        """更新数据源状态"""
        if source_name not in self._sources:
            return

        source = self._sources[source_name]

        if last_event_time is not None:
            source.last_event_time = last_event_time

        if events_per_minute is not None:
            source.events_per_minute = events_per_minute

        if error_count is not None:
            source.error_count = error_count

        if error_message is not None:
            source.error_message = error_message

        # 更新状态
        self._update_status(source)

    def _update_status(self, source: DataSourceHealth) -> None:
        """根据指标更新状态"""
        now = datetime.now(timezone.utc)

        # 检查是否超时(5分钟无事件视为down)
        if source.last_event_time:
            elapsed = (now - source.last_event_time).total_seconds()
            if elapsed > 300:
                source.status = DataSourceStatus.DOWN
                return

        # 检查错误率
        if source.error_count > 100:
            source.status = DataSourceStatus.DOWN
        elif source.error_count > 10:
            source.status = DataSourceStatus.DEGRADED
        else:
            source.status = DataSourceStatus.HEALTHY

    def get_all(self) -> List[DataSourceHealth]:
        """获取所有数据源状态"""
        return list(self._sources.values())

    def get(self, source_name: str) -> Optional[DataSourceHealth]:
        """获取指定数据源状态"""
        return self._sources.get(source_name)


# 全局数据源注册表
_source_registry = DataSourceRegistry()


# 预注册标准数据源
_source_registry.register(
    source_type="ssh_syslog",
    source_name="cisco_asa",
    host="0.0.0.0",
    port=514,
    protocol="tcp"
)
_source_registry.register(
    source_type="ssh_syslog",
    source_name="fortinet_fortigate",
    host="0.0.0.0",
    port=514,
    protocol="tcp"
)
_source_registry.register(
    source_type="windows_event",
    source_name="windows_server_01",
    host="nxlog",
    port=514
)
_source_registry.register(
    source_type="snmp_trap",
    source_name="network_devices",
    host="snmptrapd",
    port=162
)
_source_registry.register(
    source_type="api_polling",
    source_name="threat_intel"
)
_source_registry.register(
    source_type="api_polling",
    source_name="siem_integration"
)
_source_registry.register(
    source_type="jdbc",
    source_name="siem_audit_db"
)


@router.get("/sources", response_model=List[DataSourceHealth])
async def get_all_source_health():
    """获取所有数据源健康状态

    Returns:
        List[DataSourceHealth]: 所有已注册数据源的健康状态列表
    """
    return _source_registry.get_all()


@router.get("/sources/{source_name}", response_model=DataSourceHealth)
async def get_source_health(source_name: str):
    """获取指定数据源健康状态

    Args:
        source_name: 数据源名称

    Returns:
        DataSourceHealth: 数据源健康状态

    Raises:
        HTTPException: 数据源不存在时抛出404
    """
    source = _source_registry.get(source_name)
    if not source:
        raise HTTPException(status_code=404, detail=f"Data source '{source_name}' not found")
    return source


@router.post("/sources/{source_name}/report")
async def report_source_status(
    source_name: str,
    last_event_time: Optional[datetime] = None,
    events_per_minute: Optional[float] = None,
    error_count: Optional[int] = None,
    error_message: Optional[str] = None
):
    """数据源上报自身状态(供collector调用)

    Args:
        source_name: 数据源名称
        last_event_time: 最近事件时间
        events_per_minute: 每分钟事件数
        error_count: 累计错误数
        error_message: 最新错误信息

    Returns:
        dict: 确认信息
    """
    _source_registry.update(
        source_name=source_name,
        last_event_time=last_event_time,
        events_per_minute=events_per_minute,
        error_count=error_count,
        error_message=error_message
    )
    return {"status": "ok", "source_name": source_name}


@router.get("/summary")
async def get_health_summary():
    """获取健康检查摘要

    Returns:
        dict: 包含healthy/degraded/down数量的摘要
    """
    sources = _source_registry.get_all()
    summary = {
        "total": len(sources),
        "healthy": sum(1 for s in sources if s.status == DataSourceStatus.HEALTHY),
        "degraded": sum(1 for s in sources if s.status == DataSourceStatus.DEGRADED),
        "down": sum(1 for s in sources if s.status == DataSourceStatus.DOWN),
        "checked_at": datetime.now(timezone.utc).isoformat()
    }
    return summary
```

更新 `api/main.py` 注册路由:

```python
from api.health import router as health_router

app.include_router(health_router)
```

**关键点:**
- 预注册所有标准数据源
- 支持5分钟超时检测(down状态)
- /report端点供collector主动上报
- summary端点提供聚合视图
  </action>
  <verify>
    <automated>grep -l "DataSourceHealth" api/health.py && grep -l "/sources" api/health.py</automated>
  </verify>
  <done>数据源健康检查API完成，支持查看所有数据源状态、单个数据源详情、主动上报</done>
</task>

</tasks_2>

<verification>
## Phase 5 验证检查

### DS-01 (SSH Syslog)
- [ ] `collector/configs/vector-syslog.yaml` 存在且包含 syslog source
- [ ] `collector/configs/vector-syslog.yaml` 包含 kafka sink
- [ ] `collector/configs/sources/syslog/` 目录存在

### DS-02 (Windows Event Log)
- [ ] `collector/configs/sources/windows_events/nxlog.conf` 存在
- [ ] nxlog.conf 包含 im_msvistalog 和 om_tcp 模块

### DS-03 (SNMP Trap)
- [ ] `collector/configs/sources/snmp_traps/snmptrapd.conf` 存在
- [ ] snmptrapd.conf 包含 forward 指令

### DS-04 (API轮询)
- [ ] `collector/configs/vector-http-polling.yaml` 存在
- [ ] 包含 http_client source 和 kafka sink
- [ ] `collector/configs/sources/api_polling/` 目录存在

### DS-05 (JDBC)
- [ ] `collector/polling/jdbc_poller.py` 存在
- [ ] 包含 JdbcPoller 类
- [ ] 包含 schedule 和 Kafka Producer

### DS-06 (健康检查)
- [ ] `api/health.py` 存在
- [ ] 包含 GET /api/health/sources 端点
- [ ] 包含 DataSourceHealth 模型
</verification>

<success_criteria>
## Phase 5 完成标准

1. **DS-01 完成**: Vector Syslog源配置可接收SSH设备告警并转发到Kafka
2. **DS-02 完成**: nxlog配置可将Windows Event Log转发为Syslog
3. **DS-03 完成**: snmptrapd配置可将SNMP Trap转发为Syslog
4. **DS-04 完成**: Vector HTTP Client配置支持API轮询
5. **DS-05 完成**: Python JDBC轮询脚本支持数据库告警采集
6. **DS-06 完成**: /api/health/sources 端点返回所有数据源健康状态

**所有6个需求(DS-01~DS-06)均已实现。**
</success_criteria>

<output>
完成后创建 `.planning/phases/05-multi-datasource/05-PLAN-SUMMARY.md`:
- Phase目标完成情况
- 创建的文件列表
- 验证结果
- 遇到的问题和解决方案
</output>
