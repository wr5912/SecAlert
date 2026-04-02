---
phase: 15-data-ingestion-enhancement
plan: 05
subsystem: data-ingestion
tags: [gap-closure, AI-recognition, template-save]
dependency_graph:
  requires: []
  provides: []
  affects: []
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - src/api/ingestion_endpoints.py
    - frontend/src/components/ingestion/wizard/Step3LogFormat.tsx
    - frontend/src/components/ingestion/wizard/AIDetectPanel.tsx
    - frontend/src/stores/ingestionStore.ts
    - frontend/src/types/ingestion.ts
decisions: []
metrics:
  duration: ""
  completed: "2026-04-02"
  tasks: 3
---

# Phase 15 Plan 05: Gap Closure Summary

## 一句话说明
修复 AI 识别流程断点：recognize_log_format 返回 503 错误、AI 识别后自动保存模板、应用映射按钮实现保存逻辑。

## 完成的 Must-Haves

### 1. recognize_log_format 端点修复 (Task 1)
**问题:** DSPy 不可用时返回模拟 CEF 响应而非 503 错误

**修复:**
- 删除 `if DSPY_AVAILABLE:` 条件检查
- 删除第 359-376 行的模拟响应分支
- 保留第 320-324 行的 503 检查作为唯一 fallback

**验证:** API 在 LLM 不可用时返回 503 错误

### 2. AI 识别成功后自动保存模板 (Task 2)
**修复内容:**
- `ingestionStore` 添加 `currentTemplateId` 状态和 `setCurrentTemplateId` action
- `AIDetectPanel` 在 `onSuccess` 回调中自动调用 POST `/api/ingestion/templates` 创建模板
- 创建的模板 ID 保存到 store 供后续步骤使用

### 3. MappingPreview 和应用映射按钮 (Task 2)
**修复内容:**
- `Step3LogFormat` 从 store 获取 `currentTemplateId` 而非空字符串
- `MappingPreview` 使用正确的 `templateId` 和 `sampleLogs`
- "应用映射"按钮实现：PUT 更新模板的 `custom_regex`，同时 fieldMappings 已保存在 store

### 4. 类型定义完善 (Task 3)
**修复内容:**
- `LogFormatRecognitionResult` 添加 `detected_fields?: string[]` 可选字段

## Deviations from Plan

无偏差 - 计划执行完全符合。

## Commits

| Hash | Message |
|------|---------|
| 764a3d1 | fix(15-05): recognize_log_format 返回 503 而非模拟响应 |
| 930b4a3 | feat(15-05): AI 识别成功后自动保存模板并传递 templateId |
| 1907161 | docs(15-05): LogFormatRecognitionResult 添加 detected_fields 字段 |

## Self-Check: PASSED

- [x] Task 1: recognize_log_format 端点修复完成
- [x] Task 2: AI 识别后自动保存模板完成
- [x] Task 3: 类型定义完善完成
- [x] 所有任务已提交
- [x] 前端构建验证通过
