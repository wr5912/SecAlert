---
phase: 03-core-analysis-engine
plan: "02"
subsystem: analysis
tags: [neo4j, false-positive, suppression, metrics, analysis-service]

# Dependency graph
requires:
  - phase: 03-01
    provides: DSPy 分类器 ChainClassifierProgram，预置分类规则，ATT&CK 严重度评分
  - phase: 02-attack-chain-correlation
    provides: Neo4j 客户端，攻击链模型 AttackChainModel
provides:
  - AnalysisService 分析服务（Neo4j 读取 + 分类 + 状态更新）
  - FalsePositiveMetricsCollector 误报率统计（< 30% 目标判断）
affects:
  - phase-03 (后续计划)
  - API 服务层

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 软删除策略（false_positive 状态标记，不物理删除）
    - 误报可恢复（restore_chain 操作）
    - 误报率统计：false_positive / total < 30%

key-files:
  created:
    - src/analysis/service.py
    - src/analysis/metrics.py
  modified:
    - src/analysis/__init__.py

key-decisions:
  - "D-05: 误报链软删除（false_positive 状态）"
  - "D-06: 误报可恢复（restore_chain 方法）"

patterns-established:
  - "Neo4j 状态驱动：update_chain_status 控制攻击链生命周期"
  - "误报率统计：fp_rate < 0.30 目标判断"

requirements-completed: [FILTER-01, DETECT-01]

# Metrics
duration: 1min
completed: 2026-03-24
---

# Phase 03 Plan 02: AnalysisService 和 FalsePositiveMetrics Summary

**AnalysisService 分析服务（Neo4j 读取 + 分类 + 软删除）+ FalsePositiveMetricsCollector 误报率统计（< 30% 目标判断）**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-24T03:00:00Z
- **Completed:** 2026-03-24T03:01:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 实现 AnalysisService 分析服务（186 行）
  - `classify_chain`: 从 Neo4j 读取攻击链，调用分类器，根据置信度阈值决定抑制或放行
  - `restore_chain`: 将 false_positive 链恢复为 active
  - `list_false_positives`: 返回误报链列表供人工审核
  - `batch_classify`: 批量分类攻击链
  - 软删除：调用 `neo4j.update_chain_status(chain_id, "false_positive")`
  - 恢复：调用 `neo4j.update_chain_status(chain_id, "active")`
- 实现 FalsePositiveMetricsCollector 误报率统计（169 行）
  - `FalsePositiveMetrics` dataclass：包含 fp_rate, fp_rate_percent, target_met 等字段
  - `calculate_fp_rate`: 计算误报率，target_met = fp_rate < 0.30
  - `get_severity_distribution`: 获取严重度分布
  - `get_suppression_log`: 获取抑制日志
- 更新 `src/analysis/__init__.py`：导出 FalsePositiveMetricsCollector

## Task Commits

Each task was committed atomically:

1. **Task 1: 实现 AnalysisService 分析服务** - `feat(03-02): 实现 AnalysisService 分析服务` (service.py)
2. **Task 2: 实现 FalsePositiveMetrics 误报率统计** - `feat(03-02): 实现 FalsePositiveMetricsCollector` (metrics.py)

## Files Created/Modified

- `src/analysis/service.py` - AnalysisService 分析服务（186 行）
- `src/analysis/metrics.py` - FalsePositiveMetricsCollector 误报率统计（169 行）
- `src/analysis/__init__.py` - 更新导出 FalsePositiveMetricsCollector

## Key Links

| From | To | Via |
|------|----|-----|
| src/analysis/service.py | src/graph/client.py | Neo4jClient.update_chain_status() |
| src/analysis/service.py | src/analysis/classifier/programs.py | ChainClassifierProgram.classify_with_threshold() |
| src/analysis/metrics.py | src/graph/client.py | Neo4jClient.list_chains() |

## Decisions Made

- D-05: 误报链软删除（false_positive 状态，不物理删除）
- D-06: 误报可恢复（restore_chain 方法将 false_positive 恢复为 active）

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| AnalysisService 从 Neo4j 读取攻击链进行分类 | PASS |
| 误报链调用 neo4j.update_chain_status(chain_id, "false_positive") 软删除 | PASS |
| 真实攻击链调用 neo4j.update_chain_status(chain_id, "active") | PASS |
| restore_chain 方法将 false_positive 链恢复为 active | PASS |
| FalsePositiveMetricsCollector.calculate_fp_rate() 计算误报率，target_met = fp_rate < 0.30 | PASS |
| list_false_positives 返回 status="false_positive" 的链列表 | PASS |

## Deviations from Plan

**None - plan executed exactly as written**

## Issues Encountered

None

## Next Phase Readiness

- AnalysisService 就绪，可供 API 服务层调用
- FalsePositiveMetricsCollector 可计算误报率指标
- Phase 03 后续计划可继续执行

---
*Phase: 03-core-analysis-engine*
*Completed: 2026-03-24*
