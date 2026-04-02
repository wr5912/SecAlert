---
phase: 15-data-ingestion-enhancement
plan: 01
subsystem: api
tags: [dspy, fastapi, react, ai, ocsf, log-parsing]

# Dependency graph
requires:
  - phase: 14-data-ingestion-ui
    provides: 前端向导 UI 框架和 Zustand store
provides:
  - DSPy LogFormatRecognition Signature 定义
  - POST /api/ingestion/recognize-format AI 识别端点
  - POST /api/ingestion/preview-parse 解析预览端点
  - SampleLogInput 和 AIDetectPanel 前端组件
affects:
  - phase 15 (后续 plan 需要使用这些 API 和组件)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DSPy Signature 模式用于 LLM 输入输出规范
    - OCSF (Open Cybersecurity Schema Framework) 归一化字段映射
    - TanStack Query useMutation 进行 API 调用

key-files:
  created:
    - src/api/parse_test_models.py - Pydantic 模型
    - frontend/src/components/ingestion/wizard/AIDetectPanel.tsx
    - frontend/src/components/ingestion/wizard/SampleLogInput.tsx
  modified:
    - parser/dspy/signatures/__init__.py - LogFormatRecognition Signature
    - src/api/ingestion_endpoints.py - 新增 API 端点
    - frontend/src/components/ingestion/wizard/Step3LogFormat.tsx - 标签页切换
    - frontend/src/types/ingestion.ts - LogFormatRecognitionResult 接口

key-decisions:
  - "使用 DSPy 可用性检测模式，Python 3.8 兼容"
  - "OCSF Category UID: 2 (Findings), 1 (System), 4 (Network)"
  - "置信度 < 0.7 时显示需人工确认警告"

patterns-established:
  - "Pattern 1: DSPy Signature 定义 - 使用 InputField/OutputField 定义 LLM 输入输出"
  - "Pattern 2: AI 组件四状态模式 - idle/loading/success/error"

requirements-completed: [DI-07]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 15 Plan 01: AI 自动识别日志格式 (DI-07) Summary

**DI-07 AI 自动识别功能：用户提供 3-5 条示例日志，系统自动识别日志格式（CEF/Syslog/JSON/Custom），推荐 OCSF 统一字段映射，返回置信度评分**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T02:48:30Z
- **Completed:** 2026-04-02T02:55:30Z
- **Tasks:** 3
- **Files modified:** 6 (created: 4, modified: 2)

## Accomplishments

- 实现 DSPy LogFormatRecognition Signature，支持 OCSF 归一化字段映射
- 创建 POST /api/ingestion/recognize-format 端点，调用 LLM 识别日志格式
- 创建 POST /api/ingestion/preview-parse 端点，支持解析预览
- 前端 AI 识别面板（SampleLogInput + AIDetectPanel），四状态切换
- Step3LogFormat 新增"自动识别"/"手动配置"标签页

## Task Commits

Each task was committed atomically:

1. **Task 1: 创建 DSPy LogFormatRecognition Signature** - `7844fef` (feat)
2. **Task 2: 创建 AI 识别 API 端点** - `cf1f5cf` (feat)
3. **Task 3: 创建前端 AIDetectPanel 组件** - `bef42c3` (feat)

## Files Created/Modified

- `parser/dspy/signatures/__init__.py` - LogFormatRecognition Signature 定义（DSPy 可用性检测 + 存根实现）
- `src/api/parse_test_models.py` - Pydantic 模型（ParseTestRequest/Result, LogFormatRecognitionRequest/Response）
- `src/api/ingestion_endpoints.py` - 新增 /recognize-format 和 /preview-parse 端点
- `frontend/src/components/ingestion/wizard/AIDetectPanel.tsx` - AI 识别结果展示面板
- `frontend/src/components/ingestion/wizard/SampleLogInput.tsx` - 示例日志输入组件
- `frontend/src/components/ingestion/wizard/Step3LogFormat.tsx` - 新增自动/手动标签页
- `frontend/src/types/ingestion.ts` - LogFormatRecognitionResult 接口

## Decisions Made

- 使用 DSPy 可用性检测模式，Python 3.8 兼容（无 DSPy 时使用存根类）
- OCSF 归一化采用 Category UID 2 (Findings) 作为默认值
- 置信度阈值 0.7 用于显示"需人工确认"警告
- LLM 不可用时 API 返回 503 错误，而非模拟数据（模拟数据仅用于 DSPy 不可用时）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- DI-07 AI 自动识别功能已完成，可供后续 plan 使用
- 字段映射 UI 组件（Task 15-01-02）依赖此 plan 建立的 API
- 批量接入（DI-08）和解析测试（DI-09）将在后续 plan 中实现

---
*Phase: 15-data-ingestion-enhancement*
*Plan: 01*
*Completed: 2026-04-02*
