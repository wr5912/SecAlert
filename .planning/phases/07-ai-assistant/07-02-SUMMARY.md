---
phase: 07-ai-assistant
plan: 07-02
subsystem: ai-assistant
tags: [nlp, intent-recognition, remediation, httpx, fastapi]

# Dependency graph
requires:
  - phase: 07-ai-assistant (07-01)
    provides: AI助手对话框、流式响应基础设施、RemediationAdvisor基础
provides:
  - NL查询意图识别（detect_intent, extract_intent_params）
  - API调用路由（call_chain_api）
  - 自然语言响应格式化（format_alerts_response, format_chain_detail_response, format_remediation_response）
  - 自然语言处置建议生成（generate_recommendation_nl）
affects:
  - 07-ai-assistant (后续plan)
  - ai-assistant

# Tech tracking
tech-stack:
  added: [httpx]
  patterns:
    - 意图识别模式匹配
    - API调用路由
    - NL响应格式化

key-files:
  created: []
  modified:
    - src/api/chat_endpoints.py
    - src/analysis/remediation/advisor.py

key-decisions:
  - 使用正则表达式进行意图模式匹配，支持中文和英文关键词
  - 通过httpx异步调用内部API端点获取数据
  - 格式化函数将结构化数据转换为自然语言响应

patterns-established:
  - "意图识别模式：预定义patterns + 正则匹配 + 参数提取"
  - "API调用模式：base_url + urlencode查询参数 + httpx异步请求"
  - "响应格式化模式：结构化数据 -> 自然语言摘要"

requirements-completed: [AI-03, AI-04]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 07-02: AI助手自然语言查询与建议生成 Summary

**NL查询意图识别路由 + 自然语言处置建议生成：用户可以用自然语言查询告警（"查询最近1小时Critical告警"），AI理解意图调用API并返回格式化结果**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T13:16:08Z
- **Completed:** 2026-03-25T13:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Task 1 (AI-03):** 实现NL查询意图识别和路由
  - 添加 INTENT_PATTERNS 定义四种意图：query_alerts, explain_chain, get_recommendation, general_chat
  - 添加 detect_intent() 函数识别用户消息意图
  - 添加 extract_intent_params() 从消息中提取严重度和时间范围参数
  - 添加 call_chain_api() 异步调用 /api/chains 相关端点
  - 添加 format_alerts_response(), format_chain_detail_response(), format_remediation_response() 格式化响应
  - 修改 chat_stream() 支持 NL 查询意图路由

- **Task 2 (AI-04):** 实现自然语言处置建议生成
  - 在 RemediationAdvisor 中添加 generate_recommendation_nl() 方法
  - 生成包含严重度、建议动作、详细步骤、ATT&CK引用的自然语言建议

## Task Commits

Each task was committed atomically:

1. **Task 1: 实现NL查询意图识别和路由** - `7b465c6` (feat)
2. **Task 2: 实现自然语言处置建议生成** - `b4badb9` (feat)

## Files Created/Modified

- `src/api/chat_endpoints.py` - 添加NL查询意图识别、API调用路由、响应格式化函数，修改chat_stream支持意图路由
- `src/analysis/remediation/advisor.py` - 添加generate_recommendation_nl()方法生成自然语言处置建议

## Decisions Made

- 使用正则表达式进行意图模式匹配，支持中英文关键词混合识别
- API调用使用httpx异步客户端，支持超时和错误处理
- 格式化函数生成结构化的自然语言响应，便于用户理解

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- NL查询和意图路由基础设施已就绪
- 自然语言处置建议生成功能已就绪
- 依赖07-01的对话基础设施和RemediationAdvisor基础

---
*Phase: 07-ai-assistant*
*Plan: 07-02*
*Completed: 2026-03-25*
