---
phase: 15-data-ingestion-enhancement
plan: 04
subsystem: api
tags: [fastapi, parse-test, accuracy, react, di-09]

# Dependency graph
requires:
  - phase: 15-01
    provides: ingestion API endpoints and models
  - phase: 15-03
    provides: Step5BatchImport, batch state management
provides:
  - POST /api/ingestion/test-parse endpoint
  - AccuracyBadge component with 3 states (qualified/warning/failed)
  - ParseTestPanel component with 4 states (idle/testing/success/failure)
  - Step6ParseTest wizard step
affects: [frontend-ingestion]

# Tech tracking
tech-stack:
  added: []
  patterns: [TanStack Query mutation for API calls, native HTML progress bar]

key-files:
  created:
    - frontend/src/components/ingestion/wizard/AccuracyBadge.tsx
    - frontend/src/components/ingestion/wizard/ParseTestPanel.tsx
    - frontend/src/components/ingestion/wizard/Step6ParseTest.tsx
  modified:
    - src/api/ingestion_endpoints.py
    - frontend/src/types/ingestion.ts
    - frontend/src/stores/ingestionStore.ts
    - frontend/src/components/ingestion/wizard/WizardModal.tsx

key-decisions:
  - "使用 native textarea 替代不存在的 @/components/ui/textarea"
  - "使用 div 替代不存在的 @/components/ui/progress"
  - "使用简单的 span 替代 severity-specific Badge 组件"
  - "准确率阈值使用环境变量 PARSE_MIN_CONFIDENCE=0.85"
  - "字段级准确率仅在有 ground_truth 时计算"

patterns-established:
  - "Pattern: 解析测试使用 TanStack Query useMutation"
  - "Pattern: 准确率徽章根据阈值显示不同颜色"

requirements-completed: [DI-09]

# Metrics
duration: 12min
completed: 2026-04-02
---

# Phase 15 Plan 04: 解析测试功能 (DI-09) Summary

## 一句话说明
实现 DI-09 解析测试功能：用户可粘贴历史日志测试解析准确率，达标后开启实时接入。

## 做了什么

### Task 1: 创建解析测试 API 端点
- 在 `src/api/ingestion_endpoints.py` 添加 `POST /api/ingestion/test-parse` 端点
- 使用 `ThreeTierParser.parse()` 逐条解析测试日志
- 计算整体准确率 `overall_accuracy = success_count / total_logs`
- 如果提供 ground_truth，计算字段级准确率
- 准确率阈值通过环境变量 `PARSE_MIN_CONFIDENCE` 配置（默认 0.85）
- 返回 `ParseTestResult` 包含 `is_qualified` 标志

### Task 2: 创建 AccuracyBadge 和 ParseTestPanel 组件
- `AccuracyBadge.tsx`：根据准确率显示不同颜色
  - qualified (>85%): 绿色
  - warning (70-85%): 黄色
  - failed (<70%): 红色
- `ParseTestPanel.tsx`：解析测试面板，4 个状态
  - idle: 输入日志文本
  - testing: 显示进度条
  - success: 显示准确率和字段级准确率表格
  - failure: 显示未达标提示和失败样例
- 扩展 `frontend/src/types/ingestion.ts` 添加解析测试类型

### Task 3: 创建 Step6ParseTest 并完成向导集成
- 扩展 `ingestionStore.ts` 添加 `parseTestResult` 和 `isTestQualified` 状态
- 创建 `Step6ParseTest.tsx`：最后一步，达标后启用完成按钮
- 更新 `WizardModal.tsx` 支持 6 步骤向导：
  1. 设备类型
  2. 连接参数
  3. 日志格式
  4. 模板设置
  5. 批量导入
  6. 解析测试

## 偏差与说明

### 技术偏差
- `AccuracyBadge` 使用简单的 `span` 元素而非 `Badge` 组件（项目 Badge 组件是 severity 专用）
- `ParseTestPanel` 使用 native `textarea` 元素（`@/components/ui/textarea` 不存在）
- `ParseTestPanel` 使用 div 进度条（`@/components/ui/progress` 不存在）
- 这些都是 Rule 3 自动修复（缺失组件使用原生替代）

### 向导流程说明
- 新模板创建：Step1 → Step2 → Step3 → Step4(完成模板创建) → Step5(可选批量导入) → Step6(解析测试)
- 编辑模板：直接进入 Step6 进行解析测试

## 未完成项
- 无

## 提交记录

| Task | 提交哈希 | 说明 |
|------|---------|------|
| Task 1 | 3377b63 | feat(15-04): 实现 DI-09 解析测试 API 端点 |
| Task 2 | ca14a98 | feat(15-04): 创建 AccuracyBadge 和 ParseTestPanel 组件 |
| Task 3 | db65c82 | feat(15-04): 创建 Step6ParseTest 并集成到 6 步向导 |
