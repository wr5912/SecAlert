---
phase: 08-reporting
plan: 03
subsystem: reporting
tags: [reporting, datasource-health, fastapi, jinja2, rp-04]

# Dependency graph
requires:
  - phase: 08-reporting-02
    provides: "报表 API、日报/周报模板、PDF 导出"
provides:
  - "GET /api/reports/datasource-health 端点"
  - "数据源健康报表 HTML 模板"
affects:
  - "Phase 8 报表功能 (RP-04)"
  - "数据源健康监控使用者"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DataSourceHealth 接口集成"
    - "报表数据聚合 + 前端展示分离"

key-files:
  created:
    - src/templates/reports/datasource_health_report.html
  modified:
    - src/api/reports.py
    - src/api/health.py

key-decisions:
  - "直接集成 Phase 5 DS-06 DataSourceHealth 接口，而非重新设计接口"
  - "修复 health.py metadata 字段类型验证问题 (Dict[str,str] 要求字符串值)"

patterns-established:
  - "报表 API + Jinja2 模板渲染模式"

requirements-completed: [RP-04]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 8 Plan 03: 数据源健康报表 Summary

**一句话：** 实现数据源健康报表 API (GET /api/reports/datasource-health)，集成 Phase 5 DS-06 的 DataSourceHealth 接口，提供健康度评分和详细状态表格。

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T13:57:35Z
- **Completed:** 2026-03-25T14:02:00Z
- **Tasks:** 1 (decision checkpoint resolved + implementation)
- **Files modified:** 3

## User Decision

**DS-06 已完成 — 直接集成 api/health.py 的 DataSourceHealth 接口**

用户确认 Phase 5 DS-06 数据源健康监控已完成，直接集成其接口，无需设计临时接口或使用 stub 数据。

## Task Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: 实现数据源健康报表 API | `4d68b8e` | src/api/reports.py, src/api/health.py, src/templates/reports/datasource_health_report.html |

## Files Created/Modified

### 新建
- `src/templates/reports/datasource_health_report.html` - 数据源健康报表 HTML 模板
  - 健康度评分环形图 (0-100%)
  - 统计卡片：总数、正常运行、降级运行、不可用
  - 详细状态表格：类型、名称、状态、最后事件时间、事件/分钟、错误数
  - 按数据源类型分组展示

### 修改
- `src/api/reports.py` - 新增 `GET /api/reports/datasource-health` 端点
  - 从 `_source_registry` 获取所有数据源健康状态
  - 计算整体健康度评分
  - 按类型分组返回数据
  - 返回格式：`{ summary, sources_by_type, sources }`

- `src/api/health.py` - 修复 metadata 字段类型验证
  - `register()` 方法将 metadata 值转换为字符串
  - 解决 Pydantic `Dict[str, str]` 类型要求与 `port=514` (int) 的冲突

## Verification

### API 端点验证
```
GET /api/reports/datasource-health
返回:
{
  "report_title": "SecAlert 数据源健康报表",
  "generated_at": "2026-03-25T14:00:00",
  "summary": {
    "total": 7,
    "healthy": 7,
    "degraded": 0,
    "down": 0,
    "health_score": 100.0
  },
  "sources_by_type": {...},
  "sources": [...]
}
```

### 模板验证
- `grep -l "datasource_health" src/templates/reports/datasource_health_report.html` → PASSED
- 模板包含健康度评分、统计卡片、数据源表格、按类型分组等元素

## Decisions Made

1. **直接集成 DS-06 接口** — 用户确认 DS-06 已完成，直接使用 `src/api/health.py` 中的 `_source_registry` 获取数据源健康数据，无需重新设计接口。

2. **修复 metadata 类型验证** — DS-06 的 `register()` 方法在传递 `port=514` (int) 时触发 Pydantic 验证错误，在 `register()` 内部将所有 metadata 值转换为字符串解决。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 health.py metadata 类型验证错误**
- **Found during:** Task 1
- **Issue:** Pydantic ValidationError: metadata.port 期望 string 类型，实际收到 int (514)
- **Fix:** 在 `DataSourceRegistry.register()` 方法中将所有 metadata 值转换为字符串 `str(v)`
- **Files modified:** src/api/health.py
- **Commit:** 4d68b8e

## Issues Encountered

无

## Auth Gates

无

## Next Phase Readiness

- RP-04 数据源健康报表功能已完成
- 08-reporting 阶段所有计划 (08-01, 08-02, 08-03) 均已完成
- 可进行 Phase 8 收尾和 v1.1 里程碑总结

---
*Phase: 08-reporting-03*
*Completed: 2026-03-25*
*Commit: 4d68b8e*