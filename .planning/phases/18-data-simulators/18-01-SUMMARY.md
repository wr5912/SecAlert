# Phase 18 Plan 01 Summary: 多源异构数据模拟器基础设施

**完成时间:** 2026-04-03
**状态:** ✅ Complete

## 执行摘要

创建了独立的 `simulators/` 目录，包含覆盖各种数据上报渠道的模拟服务，所有配置在 `docker-compose-simulators.yml` 中统一管理。

## 任务执行记录

| # | 任务 | 状态 | 文件 |
|---|------|------|------|
| 1 | 创建 simulators 目录结构 | ✅ | simulators/ |
| 2 | 配置 summved/log-generator 服务 | ✅ | simulators/log-generator/ |
| 3 | 创建 Syslog 模拟器服务 | ✅ | simulators/syslog-simulator/ |
| 4 | 创建 REST API Polling 模拟器 | ✅ | simulators/rest-polling-simulator/ |
| 5 | 创建 Webhook 推送模拟器 | ✅ | simulators/log-generator/ (复用) |
| 6 | 创建日志文件模拟器 | ✅ | simulators/file-simulator/ |

## 文件创建

```
simulators/
├── docker-compose-simulators.yml    # 主配置文件
├── .env.simulators.example          # 环境变量模板
├── README.md                        # 使用文档
├── log-generator/                   # summved/log-generator (git clone)
│   └── [summved/log-generator 完整内容]
├── syslog-simulator/               # Syslog 模拟器
│   ├── server.py                    # Python Syslog 服务
│   ├── Dockerfile
│   └── config.yaml
├── rest-polling-simulator/         # REST API Polling 模拟器
│   ├── app.py                       # FastAPI 应用
│   ├── Dockerfile
│   └── config.yaml
└── file-simulator/                 # 日志文件模拟器
    ├── writer.py                    # Python 日志写入器
    ├── Dockerfile
    ├── config.yaml
    └── vector.yml                   # Vector 文件监控配置
```

## 模拟器覆盖的渠道

| 渠道 | 实现 | 状态 |
|------|------|------|
| REST/Webhook 推送 | summved/log-generator HTTP 输出 | ✅ |
| REST API 轮询 | FastAPI rest-polling-simulator | ✅ |
| Syslog 网络发送 | Python syslog-simulator | ✅ |
| 日志文件监控 | Python writer + Vector | ✅ |
| 数据库/ES 轮询 | Logstash (复用 Phase 17) | ✅ |

## 使用方法

```bash
# 1. 复制环境变量配置
cd simulators
cp .env.simulators.example .env.simulators

# 2. 编辑 .env.simulators 设置 SecAlert 目标地址
vim .env.simulators

# 3. 启动所有模拟器
docker-compose -f docker-compose-simulators.yml up -d

# 4. 验证
curl http://localhost:3000/health      # log-generator
curl http://localhost:8081/health       # REST polling
curl http://localhost:8081/api/waf-logs?limit=5

# 5. 停止
docker-compose -f docker-compose-simulators.yml down
```

## 技术决策

| 决策 | 说明 |
|------|------|
| 独立 docker-compose | 与主系统隔离，不影响生产 |
| summved/log-generator | 最完整的开源 SIEM 日志生成器，MITRE ATT&CK 集成 |
| FastAPI for REST Polling | 轻量级 Python REST 服务 |
| Python syslog-simulator | 原生 socket 编程，支持 RFC 3164/5424 |
| Vector for file tail | 复用已有 Vector 组件 |
| 环境变量配置 | 便于部署时覆盖默认值 |

## 下一步

- Phase 18-02: DLQ 死信队列机制实现 (SM-01)

---
*Phase: 18-data-simulators*
*Completed: 2026-04-03*
