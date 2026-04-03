# Phase 18: 多源异构数据模拟器

## 目标

创建一系列模拟各种安全设备上报数据的服务，用于测试 SecAlert 采集渠道的完整性。

## 需求背景

当前 SecAlert 已实现：
- Vector/REST API 数据采集
- Logstash 从 ES 拉取数据
- 各种格式解析（Drain、模板、LLM）

需要一套模拟环境，覆盖真实世界中的各种数据上报方式。

## 模拟器类型

### 1. 数据库/ES 轮询模拟器
- 定时轮询数据库表或 ES index
- 模拟 SQL 查询结果或 ES 查询结果
- 场景：WAF 日志、数据库审计日志

### 2. REST API 轮询模拟器
- 定时调用外部 REST API 获取日志
- 场景：云安全态势管理（CSPM）、威胁情报平台

### 3. REST/Webhook 实时推送模拟器
- 主动推送日志到 SecAlert
- 场景：防火墙、IDS、终端安全

### 4. Syslog 网络接收模拟器
- 监听 UDP/TCP Syslog 端口
- 模拟各种 Syslog 格式（RFC 3164、RFC 5424）
- 场景：网络设备、安全设备

### 5. 日志文件监控模拟器
- 监控日志文件变化
- 模拟文件追加写入
- 场景：服务器系统日志、应用日志

## 技术选型

- **语言**: Python 3.10+ (快速开发，丰富库支持)
- **框架**: FastAPI (REST) + 原生 socket (Syslog)
- **部署**: 独立 docker-compose-simulators.yml
- **数据格式**: 支持 CEF、Syslog、JSON、NCSC 等

## 输出目标

- `docker-compose-simulators.yml` - 所有模拟器服务
- 各模拟器独立配置文件
- 统一的日志格式样本

## 约束

- 模拟器与主系统隔离
- 不影响生产环境
- 易于启动/停止
- 可配置日志速率和格式
