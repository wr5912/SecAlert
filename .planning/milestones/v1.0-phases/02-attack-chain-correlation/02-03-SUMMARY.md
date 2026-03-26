# Phase 02 Plan 03: Alert Correlator Engine Summary

**Plan:** 02-03
**Phase:** 02-attack-chain-correlation
**Status:** COMPLETED
**Date:** 2026-03-23

## One-liner

实现告警关联引擎核心组件：动态时间窗口算法 (AdaptiveWindow) + 规则关联器 (AlertCorrelator) + DSL 解释器 (CorrelationRule)，支持 burst/sparse/normal 三种自适应窗口模式和 ATT&CK 阶段递进验证。

## Objective

实现告警关联引擎核心组件：动态时间窗口 + 规则关联器 + DSL 解释器。根据源 IP、目标资产、攻击类型等指标关联相关告警，为攻击链构建提供输入。

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | AdaptiveWindow 动态时间窗口算法 | DONE | 9fbbf98 |
| 2 | CorrelationRule DSL 解释器 | DONE | 9e1f328 |
| 3 | AlertCorrelator 告警关联器 | DONE | pending* |
| 4 | 关联器单元测试 | DONE | pending* |

*注：由于环境安全策略限制，Task 3 和 Task 4 的提交在当前 session 中被阻塞，需要后续手动提交或由 orchestrator 处理。

## Truths Validated

- Alerts with same source IP and valid ATT&CK stage progression are correlated
- Dynamic window adapts to alert frequency (5min for burst, 1h default, 24h max)
- Minimum 2 alerts required to form a correlation
- Correlation returns confidence score based on rule matching

## Key Files Created

| File | Purpose |
|------|---------|
| `src/chain/window/adaptive_window.py` | 动态时间窗口算法 (burst/sparse/normal 三模式) |
| `src/chain/window/__init__.py` | 窗口模块导出 |
| `src/chain/engine/dsl.py` | 关联规则 DSL 解释器 (5 种操作符) |
| `src/chain/engine/__init__.py` | 引擎模块导出 |
| `src/chain/engine/correlator.py` | 告警关联器 (集成窗口 + 规则 + ATT&CK 映射) |
| `src/chain/engine/rules/ip_correlation.yaml` | IP 关联规则配置示例 |
| `src/chain/mitre/mapper.py` | ATT&CK 映射器 (已存在，来自 02-02) |
| `tests/test_chain/test_correlator.py` | 单元测试 (11 个测试用例) |

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| 动态窗口三模式 | burst=5min (暴力破解), sparse=24h (后门), normal=1h (线性插值) | Implemented |
| 规则权重阈值 50% | 至少满足 50% 条件权重才算关联，避免误关联 | Implemented |
| 按源 IP 分组缓冲 | 同一源 IP 的告警更可能相关 | Implemented |
| ATT&CK 阶段递进验证 | 防止扫描->权限提升->扫描这种不合逻辑的关联 | Implemented |

## Architecture

```
AlertCorrelator
    ├── AdaptiveWindow (动态时间窗口)
    │   ├── burst_threshold: 10 alerts/5min → 5min window
    │   ├── sparse (<=2 alerts) → 24h window
    │   └── normal → 线性插值 30min-1h
    │
    ├── CorrelationRule (DSL 解释器)
    │   ├── same_ip_pair: 源IP或目标IP相同
    │   ├── attck_stage_progression: ATT&CK 阶段递进
    │   ├── same_attack_type: 攻击类型相同
    │   ├── same_target: 目标IP/主机名相同
    │   └── equals: 字段值相等
    │
    └── AttackChainMapper (ATT&CK 映射)
        └── 来自 02-02 plan
```

## Dependencies

- Requires: `src/chain/mitre/mapper.py` (02-02 plan)
- Required by: `02-04` (Attack Chain Storage & API)

## Metrics

| Metric | Value |
|--------|-------|
| Tasks Completed | 4/4 |
| Files Created | 6 |
| Lines of Code | ~500 |
| Test Cases | 11 |

## Verification Commands

```bash
# 导入验证
python -c "from src.chain.engine.correlator import AlertCorrelator"
python -c "from src.chain.window.adaptive_window import AdaptiveWindow"

# 窗口算法测试
python -c "
from src.chain.window.adaptive_window import AdaptiveWindow
import time
w = AdaptiveWindow()
for _ in range(15): w.record_alert(time.time())
print(f'Burst: {w.compute_window()}s (expected 300)')
w.reset()
w.record_alert(time.time() - 3600)
w.record_alert(time.time() - 7200)
print(f'Sparse: {w.compute_window()}s (expected 86400)')
"

# DSL 测试
python -c "
from src.chain.engine.dsl import CorrelationRule
rule = CorrelationRule(name='test', conditions=[
    {'field': 'src_ip', 'operator': 'same_ip_pair', 'weight': 1.0},
    {'field': 'mitre_tactic', 'operator': 'attck_stage_progression', 'weight': 2.0}
])
a1 = {'src_ip': '192.168.1.100', 'mitre_tactic': 'TA0043'}
a2 = {'src_ip': '192.168.1.100', 'mitre_tactic': 'TA0004'}
matched, conf = rule.matches(a1, a2)
print(f'matched={matched}, conf={conf}')
"

# 单元测试
pytest tests/test_chain/test_correlator.py -x -v
```

## Deviations from Plan

### Auto-fixed Issues (Rule 2 - Auto-add missing critical functionality)

**1. [Rule 2 - Missing Import] `Set` type import**
- **Found during:** Task 3
- **Issue:** `correlator.py` 使用 `Set` 类型但未从 `typing` 导入
- **Fix:** 添加 `Set` 到 `typing` 导入列表
- **Files modified:** `src/chain/engine/correlator.py`

### Environment Issues

**1. Git operations blocked**
- **Issue:** 环境安全策略在 session 中期开始阻塞 git 命令
- **Impact:** Task 3 和 Task 4 的提交未能完成
- **Workaround:** 需要 orchestrator 或后续 session 手动提交

## Self-Check

- [x] AdaptiveWindow 文件存在并实现 burst/sparse/normal 三模式
- [x] CorrelationRule DSL 支持 5 种操作符
- [x] AlertCorrelator 集成了窗口、规则、ATT&CK 映射
- [x] 测试文件覆盖所有核心功能
- [x] 所有文件已写入磁盘

## Commit History (Pending)

| Task | Commit Hash | Message |
|------|-------------|---------|
| 1 | 9fbbf98 | feat(02-03): implement AdaptiveWindow dynamic time window |
| 2 | 9e1f328 | feat(02-03): implement CorrelationRule DSL interpreter |
| 3 | pending | feat(02-03): implement AlertCorrelator with dynamic window |
| 4 | pending | test(02-03): add correlator unit tests |

---

*Plan execution completed. Git commits for Task 3-4 pending due to environment restrictions.*
