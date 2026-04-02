---
phase: 16-global-metadata
plan: "01"
subsystem: api
tags: [pydantic, metadata, collection, ocsf]

# Dependency graph
requires:
  - phase: 15-data-ingestion-enhancement
    provides: ingestion_models.py 基础模型
provides:
  - Environment 枚举 (PROD/DEV/TEST)
  - CollectionMetadata 模型 (vendor_name/product_name/device_type/tenant_id/environment/target_category_uid/target_class_uid)
  - TemplateCreate.metadata 必填字段
  - TemplateUpdate.metadata 可选字段
affects:
  - 16-02-PLAN (使用 CollectionMetadata)
  - 16-03-PLAN (使用 CollectionMetadata)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pydantic BaseModel + Field 验证模式
    - 枚举类型强制约束 (DeviceType, LogFormat, Environment)

key-files:
  created: []
  modified:
    - src/api/ingestion_models.py

key-decisions:
  - "CollectionMetadata 必须在 TemplateCreate 之前定义以避免前向引用"
  - "tenant_id 默认为 'default' 支持 MSSP 多租户场景"
  - "environment 默认为 Environment.PROD 保证生产安全"

patterns-established:
  - "元数据字段使用 Pydantic Field(...)/Field(default=) 模式"

requirements-completed: [GM-01, GM-02]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 16 Plan 01: 全局元数据体系 Summary

**CollectionMetadata 模型定义完成，支持 vendor/product/device/tenant/environment 强制元数据字段**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T12:44:00Z
- **Completed:** 2026-04-02T12:47:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- 新增 Environment 枚举 (PROD/DEV/TEST)
- 新增 CollectionMetadata 模型，包含 7 个字段
- TemplateCreate 强制要求 metadata 必填
- TemplateUpdate 支持可选 metadata 更新
- device_type/log_format 改为枚举类型约束

## Task Commits

每个任务独立提交：

1. **Task 1: 添加 Environment 枚举和 CollectionMetadata 模型** - `d96e411` (feat)
2. **Task 2: 扩展 TemplateCreate/TemplatesUpdate 支持 metadata 字段** - `b32646f` (feat)
3. **修复 CollectionMetadata 前向引用问题** - `5402dbc` (fix)

**Plan metadata:** `c305852` (docs: create 3 phase plans for global metadata)

## Files Created/Modified

- `src/api/ingestion_models.py` - 新增 Environment/CollectionMetadata，扩展 TemplateCreate/TemplateUpdate

## Decisions Made

- CollectionMetadata 定义在 ConnectionConfig 之后、DataSourceTemplate 之前，避免前向引用错误
- 使用 `Field(default="default")` 和 `Field(default=Environment.PROD)` 设置默认值

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修复 CollectionMetadata 前向引用问题**
- **Found during:** Task 2 (TemplateCreate metadata 扩展)
- **Issue:** CollectionMetadata 定义在文件末尾，导致 TemplateCreate 引用时 NameError
- **Fix:** 将 Environment 和 CollectionMetadata 移动到 TemplateCreate 之前
- **Files modified:** src/api/ingestion_models.py
- **Verification:** `python -c "from src.api.ingestion_models import CollectionMetadata, Environment, TemplateCreate; print('OK')"`
- **Committed in:** 5402dbc (fix commit)

---

**Total deviations:** 1 blocking issue auto-fixed
**Impact on plan:** 前向引用修复必要，未影响任务范围

## Issues Encountered

- 无其他问题

## Next Phase Readiness

- CollectionMetadata 模型已就绪，可供 16-02 和 16-03 使用
- TemplateCreate/TemplateUpdate 已支持 metadata 字段

---
*Phase: 16-01*
*Completed: 2026-04-02*
