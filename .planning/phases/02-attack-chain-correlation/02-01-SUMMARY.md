---
phase: "02"
plan: "01"
subsystem: attack-chain-correlation
tags:
  - test-infrastructure
  - attck-mapping
  - phase-2
  - wave-1
dependency_graph:
  requires: []
  provides:
    - tests/test_chain/
    - tests/conftest.py
    - rules/attck_suricata.yaml
  affects:
    - src/chain/mitre/mapper.py
    - src/chain/correlator/
tech_stack:
  added:
    - pytest fixtures
    - YAML rules
  patterns:
    - Mock OCSF alert generation
    - ATT&CK Tactic/Technique mapping
key_files:
  created:
    - tests/test_chain/__init__.py
    - tests/test_chain/test_correlator.py
    - tests/test_chain/test_attck_mapper.py
    - tests/test_chain/test_chain_reconstruction.py
    - tests/test_chain/test_chain_api.py
    - tests/conftest.py
    - rules/attck_suricata.yaml
  modified: []
decisions: []
metrics:
  duration: 102
  completed: "2026-03-23T08:18:46Z"
  tasks_completed: 2
  files_created: 7
---

# Phase 02 Plan 01: Test Infrastructure & ATT&CK Rules Summary

## 概述

创建 Phase 2 测试基础设施和 ATT&CK 映射规则文件，为攻击链关联引擎提供测试骨架和预置规则。

## 执行结果

| 任务 | 状态 | 提交 |
|------|------|------|
| Task 1: 创建 Phase 2 测试目录结构 | 完成 | 02f2f48 |
| Task 2: 创建 Suricata ATT&CK 映射规则文件 | 完成 | 3aa227b |

## 创建的文件

1. **tests/test_chain/__init__.py** - Python 包标记文件
2. **tests/test_chain/test_correlator.py** - 告警关联器测试骨架 (2 个测试函数)
3. **tests/test_chain/test_attck_mapper.py** - ATT&CK 映射器测试骨架 (2 个测试函数)
4. **tests/test_chain/test_chain_reconstruction.py** - 攻击链构建测试骨架 (1 个测试函数)
5. **tests/test_chain/test_chain_api.py** - 攻击链 API 测试骨架 (2 个测试函数)
6. **tests/conftest.py** - 共享 pytest fixtures (3 个 mock alert fixtures)
7. **rules/attck_suricata.yaml** - 12 条 Suricata 到 ATT&CK 的映射规则

## Mock Fixtures 创建

- `mock_ocsf_alert` - 单条 mock OCSF 格式告警
- `mock_ocsf_alerts` - 3 条关联告警（SSH 扫描 + 暴力破解）
- `mock_suricata_alert_with_attck` - 带 ATT&CK 映射信息的 Suricata 告警

## ATT&CK 映射规则覆盖

| 类别 | 告警签名 | Tactic | Technique |
|------|---------|--------|-----------|
| 扫描 | ET SCAN Potential SSH Scan | TA0043 | T1046 Network Service Discovery |
| 扫描 | ET SCAN Web Scan | TA0043 | T1046 Network Service Discovery |
| 扫描 | ET SCAN Port Scan | TA0043 | T1046 Network Service Discovery |
| 暴力破解 | ET EXPLOIT SSH Root Auth Fail | TA0006 | T1021 Remote Services |
| 暴力破解 | ET EXPLOIT FTP Login Fail | TA0006 | T1021 Remote Services |
| 暴力破解 | ET POLICY HTTP Basic Auth | TA0006 | T1078 Valid Accounts |
| 利用 | ET EXPLOIT Buffer Overflow | TA0004 | T1068 Exploitation for Privilege Escalation |
| 利用 | ET EXPLOIT SQL Injection Attempt | TA0001 | T1190 Exploit Public-Facing Application |
| 利用 | ET EXPLOIT XSS Attempt | TA0001 | T1190 Exploit Public-Facing Application |
| 命令与控制 | ET MALWARE Suspicious HTTP User-Agent | TA0011 | T1071 Application Layer Protocol |
| 命令与控制 | ET MALWARE Known Malicious HTTP Traffic | TA0011 | T1071 Application Layer Protocol |
| 数据泄露 | ET EXFILTRATION Large Outbound Data | TA0010 | T1041 Exfiltration Over C2 Channel |

## 验证结果

- `ls tests/test_chain/` 显示 4 个测试文件
- `python -c "import yaml; yaml.safe_load(open('rules/attck_suricata.yaml'))"` 无报错
- `pytest tests/test_chain/test_correlator.py --collect-only` 收集到 2 个测试函数

## 偏差记录

无偏差 - 计划完全按照执行。

## 下一步

- 02-02-PLAN.md — ATT&CK Mapper (Rule + LLM Fallback)
