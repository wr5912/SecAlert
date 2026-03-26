---
phase: "02"
plan: "02"
subsystem: attack-chain-correlation
tags:
  - attck-mapping
  - mapper
  - phase-2
  - wave-1
dependency_graph:
  requires:
    - tests/test_chain/
    - rules/attck_suricata.yaml
  provides:
    - src/chain/mitre/mapper.py
    - src/chain/mitre/__init__.py
  affects:
    - src/chain/correlator/
tech_stack:
  added:
    - AttackChainMapper class
    - AttackMapping dataclass
    - YAML rule loading
  patterns:
    - Rule-first ATT&CK mapping
    - LLM fallback inference
    - Tactic ID to name conversion
key_files:
  created:
    - src/chain/mitre/mapper.py
    - src/chain/mitre/__init__.py
    - tests/test_chain/test_attck_mapper.py
  modified:
    - tests/test_chain/test_attck_mapper.py (replaced skeleton with actual tests)
decisions: []
metrics:
  duration: 5
  completed: "2026-03-23T08:18:01Z"
  tasks_completed: 2
  files_created: 3
---

# Phase 02 Plan 02: ATT&CK Mapper (Rule + LLM Fallback) Summary

## 概述

实现 ATT&CK 映射器，使用规则优先 + LLM 兜底的混合策略将告警映射到 MITRE ATT&CK 战术和技术。

## 执行结果

| 任务 | 状态 | 提交 |
|------|------|------|
| Task 1: 实现 ATT&CK mapper | 完成 | 6e7453c |
| Task 2: 创建模块初始化和单元测试 | 完成 | 6e7453c |

## 创建的文件

### 1. src/chain/mitre/mapper.py

AttackChainMapper 类实现:

- `AttackMapping` 数据类：包含 tactic, technique_id, technique_name, confidence, source 字段
- `AttackChainMapper.__init__()`：加载 rules/attck_suricata.yaml 规则文件
- `map_to_attack(alert)`：主映射方法，规则优先查找，LLM 兜底推断
- `_llm_infer()`：LLM 推断实现（延迟加载 LogParserProgram）
- `_build_llm_prompt()`：构建 LLM 推理提示词
- `_parse_llm_response()`：解析 LLM 返回的 JSON 响应
- `get_tactic_name()`：将 Tactic ID 转换为人类可读名称

### 2. src/chain/mitre/__init__.py

模块导出：
```python
from .mapper import AttackChainMapper, AttackMapping
__all__ = ["AttackChainMapper", "AttackMapping"]
```

### 3. tests/test_chain/test_attck_mapper.py

单元测试覆盖 (6 个测试):

| 测试函数 | 描述 |
|---------|------|
| test_rule_lookup_known_signature | 验证已知告警签名返回正确 ATT&CK 映射 |
| test_rule_lookup_et_exploit_ssh | 验证 SSH 暴力破解告警映射 |
| test_rule_lookup_not_found | 验证未知签名返回 confidence=0.0 |
| test_get_tactic_name | 验证 Tactic ID 到名称转换 |
| test_empty_alert_signature | 验证空告警签名处理 |
| test_confidence_scores | 验证规则匹配高置信度 (0.95) |

## 验证结果

- `python -c "from src.chain.mitre.mapper import AttackChainMapper"` 无报错
- `python -c "from src.chain.mitre.mapper import AttackChainMapper; m = AttackChainMapper(); alert = {'alert_signature': 'ET SCAN Potential SSH Scan'}; result = m.map_to_attack(alert); print(f'mapped: {result.tactic} {result.technique_id}')"` 输出 `mapped: TA0043 T1046`
- `pytest tests/test_chain/test_attck_mapper.py -x -v` 6 个测试全部通过
- `grep -c "technique_id" tests/test_chain/test_attck_mapper.py` 显示 3 个引用

## 偏差记录

无偏差 - 计划完全按照执行。

## 下一步

- 02-03-PLAN.md — 关联规则引擎 (CorrelationRule DSL + AdaptiveWindow)
