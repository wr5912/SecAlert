---
phase: 05-multi-datasource
plan: 05
subsystem: collector
tags: [multi-datasource, syslog, windows-event, snmp-trap, api-polling, jdbc, health-check]
dependency_graph:
  requires: []
  provides: [DS-01, DS-02, DS-03, DS-04, DS-05, DS-06]
  affects: [collector, api]
tech_stack:
  added: [Vector, nxlog, snmptrapd, SQLAlchemy, schedule, confluent-kafka]
  patterns: [syslog-source, http-client-polling, jdbc-polling, health-monitoring]
key_files:
  created:
    - collector/configs/vector-syslog.yaml
    - collector/configs/sources/syslog/cisco_asa.yaml
    - collector/configs/sources/syslog/fortinet_fortigate.yaml
    - collector/configs/sources/syslog/paloalto_panos.yaml
    - collector/configs/sources/syslog/generic.yaml
    - collector/configs/sources/windows_events/nxlog.conf
    - collector/configs/sources/windows_events/README.md
    - collector/configs/sources/snmp_traps/snmptrapd.conf
    - collector/configs/sources/snmp_traps/snmptrapd.service
    - collector/configs/sources/snmp_traps/README.md
    - collector/configs/vector-http-polling.yaml
    - collector/configs/sources/api_polling/threat_intel.yaml
    - collector/configs/sources/api_polling/siem_integration.yaml
    - collector/polling/jdbc_poller.py
    - collector/polling/jdbc_poller.service
    - collector/configs/sources/jdbc/siem_audit.yaml
    - src/api/health.py
  modified:
    - src/api/main.py
decisions:
  - "TCP 模式作为生产环境 Syslog 接收默认方式"
  - "Windows Event Log 通过 nxlog 转发为 Syslog"
  - "SNMP Trap 通过 snmptrapd 中转为 Syslog"
  - "JDBC 轮询使用 Python 脚本 + SQLAlchemy"
metrics:
  duration: 205s
  completed: 2026-03-25T10:42:16Z
  tasks: 6
  files: 18
---

# Phase 05 Plan 05 Summary: 多数据源支持

## 一句话
实现多数据源接入能力，支持 Syslog、Windows Event Log、SNMP Trap、API 轮询、JDBC 五种数据源，并提供统一的数据源健康检查 API。

## 目标完成情况

| 需求 | 描述 | 状态 | 文件 |
|------|------|------|------|
| DS-01 | SSH Syslog 数据源接入 | 完成 | vector-syslog.yaml + sources/syslog/ |
| DS-02 | Windows Event Log 数据源 | 完成 | sources/windows_events/nxlog.conf |
| DS-03 | SNMP Trap 数据源 | 完成 | sources/snmp_traps/snmptrapd.conf |
| DS-04 | API 轮询数据源 | 完成 | vector-http-polling.yaml + sources/api_polling/ |
| DS-05 | JDBC 数据库数据源 | 完成 | polling/jdbc_poller.py |
| DS-06 | 数据源健康检查 API | 完成 | api/health.py |

## 创建的文件

### DS-01: Vector Syslog 数据源
- `collector/configs/vector-syslog.yaml` - 主配置 (TCP/UDP 双模式)
- `collector/configs/sources/syslog/cisco_asa.yaml` - Cisco ASA 配置
- `collector/configs/sources/syslog/fortinet_fortigate.yaml` - Fortinet 配置
- `collector/configs/sources/syslog/paloalto_panos.yaml` - Palo Alto 配置
- `collector/configs/sources/syslog/generic.yaml` - 通用配置

### DS-02: Windows Event Log
- `collector/configs/sources/windows_events/nxlog.conf` - nxlog 转发配置
- `collector/configs/sources/windows_events/README.md` - 部署说明

### DS-03: SNMP Trap
- `collector/configs/sources/snmp_traps/snmptrapd.conf` - snmptrapd 中转配置
- `collector/configs/sources/snmp_traps/snmptrapd.service` - systemd 服务
- `collector/configs/sources/snmp_traps/README.md` - 部署说明

### DS-04: API 轮询
- `collector/configs/vector-http-polling.yaml` - HTTP Client 配置
- `collector/configs/sources/api_polling/threat_intel.yaml` - 威胁情报示例
- `collector/configs/sources/api_polling/siem_integration.yaml` - SIEM 集成示例

### DS-05: JDBC 数据库
- `collector/polling/jdbc_poller.py` - Python 轮询脚本 (200+ 行)
- `collector/polling/jdbc_poller.service` - systemd 服务
- `collector/configs/sources/jdbc/siem_audit.yaml` - 配置示例

### DS-06: 健康检查 API
- `src/api/health.py` - 健康检查端点 (280+ 行)
- `src/api/main.py` - 更新路由注册

## 验证结果

### DS-01 验证
```
grep -l "type: syslog" vector-syslog.yaml && grep -l "type: kafka" vector-syslog.yaml
PASSED
```

### DS-02 验证
```
grep -l "im_msvistalog" nxlog.conf && grep -l "om_tcp" nxlog.conf
PASSED
```

### DS-03 验证
```
grep -l "snmptrapd" snmptrapd.conf && grep -l "forward default" snmptrapd.conf
PASSED
```

### DS-04 验证
```
grep -l "type: http_client" vector-http-polling.yaml && grep -l "type: kafka" vector-http-polling.yaml
PASSED
```

### DS-05 验证
```
grep -l "class JdbcPoller" jdbc_poller.py && grep -l "schedule.every" jdbc_poller.py
PASSED
```

### DS-06 验证
```
grep -l "DataSourceHealth" api/health.py && grep -l "/sources" api/health.py
PASSED
```

## 遇到的问题和解决方案

无问题遇到，计划完全按照设计执行。

## Deviation 记录

无偏差。

## Auth Gates

无认证问题。

## Self-Check: PASSED

所有文件已创建，所有验证通过。
