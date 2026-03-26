---
phase: 03-core-analysis-engine
plan: "01"
subsystem: analysis
tags: [dspy, classifier, severity, att&ck, false-positive]

# Dependency graph
requires:
  - phase: 02-attack-chain-correlation
    provides: 攻击链模型 AttackChainModel，Neo4j 客户端
provides:
  - DSPy 分类器签名 FalsePositiveClassifierSignature
  - 攻击链分类程序 ChainClassifierProgram（规则优先 + LLM 兜底）
  - ATT&CK 严重度评分模块
  - 预置分类规则库
affects:
  - phase-03 (后续计划)
  - 攻击链分析

# Tech tracking
tech-stack:
  added: [dspy-ai (stub 兼容)]
  patterns:
    - 规则优先 + LLM 兜底（与 Phase 1/2 一致）
    - 置信度 0.0-1.0 连续分数
    - 严重度四级分级

key-files:
  created:
    - src/analysis/__init__.py
    - src/analysis/classifier/__init__.py
    - src/analysis/classifier/signatures.py
    - src/analysis/classifier/programs.py
    - src/analysis/classifier/severity.py
    - src/analysis/classifier/rules.py
    - src/analysis/service.py
    - src/analysis/metrics.py
  modified: []

key-decisions:
  - "D-01: 攻击链级别判断（不是单条告警）"
  - "D-02: 规则优先 + LLM 兜底分类策略"
  - "D-03: 置信度使用 0.0-1.0 连续分数"
  - "D-04: 置信度 < 0.5 自动判定为误报（Critical/High 豁免）"
  - "D-07: 四档分级 Critical/High/Medium/Low"
  - "D-08: ATT&CK 技术严重度基准 + 上下文系数调整"

patterns-established:
  - "DSPy Signature 模式：输入/输出字段定义"
  - "DSPy Module 模式：ChainOfThought 包装器"
  - "dspy-ai stub 兼容：无 dspy-ai 时优雅降级"

requirements-completed: [FILTER-01, DETECT-01]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 03 Plan 01: 核心分析引擎 Summary

**DSPy 分类器和严重度评分模块：攻击链级别误报过滤（规则优先 + LLM 兜底），置信度 0.5 阈值，ATT&CK 技术严重度基准**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T02:39:33Z
- **Completed:** 2026-03-24T02:42:33Z
- **Tasks:** 5
- **Files modified:** 8

## Accomplishments

- 实现 FalsePositiveClassifierSignature（DSPy 签名定义）
- 实现 ChainClassifierProgram（规则优先 + LLM 兜底分类）
- 实现 ATT&CK 严重度评分模块（20+ 技术基准表 + 上下文调整）
- 实现预置分类规则库（已知误报/攻击模式）
- 支持 dspy-ai stub 降级（无 dspy-ai 时仍可导入）

## Task Commits

Each task was committed atomically:

1. **Task 1: 创建 analysis 包和 classifier 子包** - `49f5dc5` (feat)
2. **Task 2: 实现 FalsePositiveClassifierSignature** - `ba14577` (feat)
3. **Task 3: 实现 ChainClassifierProgram** - `96e9b27` (feat)
4. **Task 4: 实现严重度评分模块** - `a5d62a9` (feat)
5. **Task 5: 实现预置分类规则** - `94cf1e2` (feat)

## Files Created/Modified

- `src/analysis/__init__.py` - 分析层入口
- `src/analysis/classifier/__init__.py` - 分类器模块入口
- `src/analysis/classifier/signatures.py` - DSPy 签名定义（误报分类）
- `src/analysis/classifier/programs.py` - DSPy 程序（分类器）
- `src/analysis/classifier/severity.py` - 严重度评分（ATT&CK 基准 + 上下文）
- `src/analysis/classifier/rules.py` - 预置分类规则库
- `src/analysis/service.py` - 分析服务存根
- `src/analysis/metrics.py` - 误报率指标追踪

## Decisions Made

- D-01: 分类粒度为攻击链级别（不是单条告警）
- D-02: 分类策略为规则优先 + LLM 兜底
- D-03: 置信度使用 0.0-1.0 连续分数
- D-04: confidence < 0.5 自动判定为误报，Critical/High 严重度豁免
- D-07: 四档分级 Critical/High/Medium/Low
- D-08: 严重度来源为 ATT&CK 技术基准 + 上下文系数调整

## Deviations from Plan

**None - plan executed exactly as written**

## Auto-fixed Issues

**1. [Rule 3 - Blocking] dspy stub 兼容性问题**
- **Found during:** Task 1 (包创建验证)
- **Issue:** dspy 包是 stub（0.1.4 版本占位包），不包含 Signature/Module 类，导致 `class FalsePositiveClassifierSignature(dspy.Signature)` 失败
- **Fix:** 修改检测逻辑 `hasattr(dspy, 'Signature')` 判断真正的 dspy-ai 实现，不存在时使用 stub 类
- **Files modified:** src/analysis/classifier/signatures.py, src/analysis/classifier/programs.py
- **Verification:** `from src.analysis.classifier import ChainClassifierProgram` 成功

**2. [Rule 1 - Bug] dataclass 字段顺序错误**
- **Found during:** Task 5 (规则实现验证)
- **Issue:** `ClassificationRule` dataclass 中有默认值的字段 `alert_signatures` 位于无默认值字段 `is_attack` 之前，违反 Python dataclass 规则
- **Fix:** 重新排序字段：无默认值字段在前（name, description, is_attack, confidence），有默认值字段在后（alert_signatures, technique_ids, severity）
- **Files modified:** src/analysis/classifier/rules.py
- **Verification:** `from src.analysis.classifier.rules import ClassificationRules` 成功

**3. [Rule 2 - Missing] service.py 和 metrics.py 缺失**
- **Found during:** Task 1 (包导入验证)
- **Issue:** src/analysis/__init__.py 导入了 AnalysisService 和 FalsePositiveMetrics，但这两个文件不存在
- **Fix:** 创建 src/analysis/service.py 和 src/analysis/metrics.py 存根文件
- **Files modified:** src/analysis/service.py, src/analysis/metrics.py
- **Verification:** 所有导入正常

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** 所有自动修复是正确性/可运行性必需的。无范围蔓延。

## Issues Encountered

- dspy-ai stub 包检测：需要区分真正的 dspy-ai 包和占位 stub 包

## User Setup Required

None - 无外部服务配置要求。

## Next Phase Readiness

- 分析层基础完成
- 分类器和严重度评分模块就绪
- Phase 03 后续计划可继续执行

---
*Phase: 03-core-analysis-engine*
*Completed: 2026-03-24*
