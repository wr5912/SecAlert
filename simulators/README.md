# SecAlert 多源异构数据模拟器

用于测试 SecAlert 采集渠道的完整性，模拟各种安全设备数据上报方式。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecAlert 主系统                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Vector   │  │  REST    │  │  Syslog  │  │ Logstash │       │
│  │ (File)   │  │ (Polling) │  │ (Network)│  │  (ES)    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │              │
│       └──────────────┴──────────────┴──────────────┘              │
│                            │                                      │
│                      ┌─────▼─────┐                                │
│                      │   Kafka    │                                │
│                      │ raw-events │                                │
│                      └───────────┘                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  simulators/ (独立部署)                          │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  log-generator   │  │ syslog-simulator │                    │
│  │  (summved)       │  │  (CEF/Syslog)    │                    │
│  │  HTTP 推送       │  │  UDP/TCP 发送    │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                                │
│           ▼                     ▼                                │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │rest-polling-      │  │  file-simulator  │                    │
│  │simulator         │  │  (日志文件)      │                    │
│  │  REST API 轮询   │  │  Vector 监控     │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## 包含的模拟器

### 1. log-generator (summved/log-generator)

**功能:** 企业级 SIEM 日志生成器
- 12+ 种数据源 (Endpoint, Firewall, Cloud, Auth, DB 等)
- MITRE ATT&CK 框架集成
- 多阶段攻击链模拟
- 输出格式: JSON, Syslog, CEF, HTTP

**端口:**
- 3000: HTTP API
- 8080: Prometheus Metrics

**配置:**
```bash
SIEM_HTTP_URL=http://localhost:9000/api/v1/ingest
```

### 2. syslog-simulator

**功能:** Syslog 网络发送/接收模拟器
- 生成 CEF 格式安全日志
- 模拟 Check Point, Palo Alto, Fortinet, Cisco ASA 等设备
- 支持 UDP/TCP 协议
- ATT&CK 技术映射

**端口:**
- 1514: Syslog 监听 (UDP/TCP)

**配置:**
```yaml
target_host: localhost      # SecAlert Vector Syslog 源
target_port: 514           # Syslog 端口
rate: 10                   # 每秒日志数
format: CEF
```

### 3. rest-polling-simulator

**功能:** REST API Polling 模拟器
- 模拟 WAF、威胁情报平台等 REST API
- 实时产生安全告警
- 支持分页 (since_id)

**端口:**
- 8081: REST API

**Endpoints:**
- `GET /api/waf-logs` - WAF 日志
- `GET /api/threat-intel` - 威胁情报
- `GET /api/dns-logs` - DNS 查询日志

### 4. file-simulator

**功能:** 日志文件监控模拟器
- 持续写入模拟应用日志
- Vector 监控文件变化
- 输出到 Kafka

**日志文件:**
- `/app/logs/app.log` - 应用日志
- `/app/logs/auth.log` - 认证日志
- `/app/logs/network.log` - 网络日志

## 快速开始

### 1. 复制环境变量配置

```bash
cd simulators
cp .env.simulators.example .env.simulators
# 编辑 .env.simulators 设置目标地址
```

### 2. 启动所有模拟器

```bash
docker-compose -f docker-compose-simulators.yml up -d
```

### 3. 验证服务

```bash
# log-generator
curl http://localhost:3000/health

# REST polling simulator
curl http://localhost:8081/health
curl http://localhost:8081/api/waf-logs?limit=5

# syslog-simulator
nc -u localhost 1514

# 验证 Kafka 收到数据
docker exec -it kafka kafka-console-consumer --topic raw-events --from-beginning --bootstrap-server localhost:9092
```

### 3. 停止所有模拟器

```bash
docker-compose -f docker-compose-simulators.yml down
```

## 独立启动某个模拟器

```bash
# 只启动 log-generator
docker-compose -f docker-compose-simulators.yml up -d log-generator

# 只启动 REST polling simulator
docker-compose -f docker-compose-simulators.yml up -d rest-polling-simulator

# 只启动 syslog simulator
docker-compose -f docker-compose-simulators.yml up -d syslog-simulator

# 只启动 file simulator
docker-compose -f docker-compose-simulators.yml up -d file-simulator
```

## 配置说明

### SecAlert 目标地址

| 模拟器 | 默认目标 | 环境变量 |
|--------|----------|----------|
| log-generator | http://localhost:9000/api/v1/ingest | SECALERT_INGEST_URL |
| syslog-simulator | localhost:514 | SECALERT_SYSLOG_HOST, SECALERT_SYSLOG_PORT |
| rest-polling-simulator | - (被动服务) | - |
| file-simulator | kafka:9092 | KAFKA_BOOTSTRAP |

### 调整日志速率

```bash
# 环境变量方式
SIMULATOR_RATE=50 docker-compose -f docker-compose-simulators.yml up -d

# 或在 .env.simulators 中设置
SIMULATOR_RATE=50
```

## 日志格式示例

### CEF (syslog-simulator)

```
CEF:0|Check Point|VPN-1|R80.30|T1078|Valid Accounts|6|src=192.168.1.100 dst=10.0.0.1 spt=443 dpt=22 act=blocked msg=Attempted Valid Accounts from 192.168.1.100 to 10.0.0.1:22
```

### JSON (rest-polling-simulator)

```json
{
  "alert_id": "ALERT-1712123456789-1234",
  "timestamp": "2026-04-03T12:34:56.789Z",
  "severity": "high",
  "category": "SQL Injection",
  "source": "WAF",
  "src_ip": "203.0.113.42",
  "dst_ip": "10.0.0.100",
  "src_port": 54321,
  "dst_port": 443,
  "action": "blocked"
}
```

## 故障排除

### log-generator 启动失败

```bash
# 检查日志
docker logs log-generator-prod

# 重新构建
docker-compose -f docker-compose-simulators.yml build log-generator
```

### 无法连接 SecAlert

```bash
# 检查网络
docker network ls
docker network inspect simulators_simulators-net

# 验证端口连通性
docker exec -it log-generator-prod curl http://localhost:9000/health
```

### Kafka 没有收到数据

```bash
# 检查 Kafka topic
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092

# 检查消费者
docker exec -it kafka kafka-console-consumer --topic raw-events --from-beginning --bootstrap-server localhost:9092
```

## 开发

### 添加新的模拟器

1. 在 `simulators/` 下创建子目录
2. 添加 `Dockerfile` 和 `config.yaml`
3. 在 `docker-compose-simulators.yml` 中添加 service
4. 更新本文档

### 本地运行 (不使用 Docker)

```bash
# REST polling simulator
cd rest-polling-simulator
pip install -r requirements.txt
python app.py

# syslog simulator
cd syslog-simulator
pip install pyyaml
python server.py
```

## 参考

- [summved/log-generator](https://github.com/summved/log-generator) - SIEM 日志生成器
- [Vector Configuration](https://vector.dev/docs/configuration/) - Vector 配置参考
- [MITRE ATT&CK](https://attack.mitre.org/) - 攻击技术框架
- [CEF Specification](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors/_pdf/ElasticCoreTransformationContentPDF.pdf) - CEF 格式规范
