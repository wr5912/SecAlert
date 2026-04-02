---
phase: 15-data-ingestion-enhancement
plan: "15-10"
subsystem: ingestion-ui
tags: [wizard, refactor, parse-test]
dependency_graph:
  requires: []
  provides:
    - WizardModal 4 步向导
    - Step4Complete 内部状态机
  affects:
    - ingestion.ts
    - WizardModal.tsx
    - Step4Complete.tsx
tech_stack:
  added: []
  patterns:
    - 内部状态机 (settings/testing/confirmed)
    - 向导步骤压缩
key_files:
  created: []
  modified:
    - frontend/src/types/ingestion.ts
    - frontend/src/components/ingestion/wizard/WizardModal.tsx
    - frontend/src/components/ingestion/wizard/Step4Complete.tsx
decisions:
  - D-01: 向导从 6 步压缩到 4 步
  - D-03: 解析测试必须在点击「完成」前通过
  - D-04: 模板设置 → 开始解析测试 → 测试通过 → 显示确认页 → 点「完成」关闭
  - D-05: 解析测试未通过时，「完成」按钮禁用
  - D-08: 解析测试通过后，显示确认页（有「完成」按钮和「再次测试」选项）
  - D-09: 点击「完成」关闭弹窗，数据保存
metrics:
  duration: 2 min
  tasks_completed: 4
  completed_date: "2026-04-02T14:22:40Z"
---

# Phase 15 Plan 10: WizardModal 4 步重构总结

## 一句话描述
将数据接入向导从 6 步压缩到 4 步，步骤 4 合并模板设置和解析测试功能

## 任务完成情况

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | 更新 WIZARD_STEPS 从 6 步到 4 步 | f6697af | ingestion.ts |
| 2 | 重构 Step4Complete 合并 ParseTestPanel | eda41f4 | Step4Complete.tsx |
| 3 | 重构 WizardModal 移除步骤 5 和 6 | b7e59d5 | WizardModal.tsx |
| 4 | 验证 StepIndicator 支持 4 步显示 | - | (无需修改) |

## 变更详情

### Task 1: WIZARD_STEPS 更新
- **前:** 6 步 (设备类型 → 连接参数 → 日志格式 → 模板设置 → 批量导入 → 完成)
- **后:** 4 步 (设备类型 → 连接参数 → 日志格式 → 完成)
- **commit:** f6697af

### Task 2: Step4Complete 重构
- 实现内部状态机：`settings` → `testing` → `confirmed`
- **settings 阶段:** 显示配置摘要和「开始解析测试」按钮
- **testing 阶段:** 显示 ParseTestPanel 进行解析测试
- **confirmed 阶段:** 测试通过后显示成功提示和「完成」按钮
- 完成按钮 `disabled={!isTestQualified}` 实现 D-05
- commit: eda41f4

### Task 3: WizardModal 重构
- 移除 Step5BatchImport 和 Step6ParseTest 导入
- renderStep 仅保留 case 1-4
- 移除「跳过批量导入」按钮
- Footer 条件改为 `step <= 4`
- **commit:** b7e59d5

### Task 4: StepIndicator 验证
- StepIndicator 使用 `WIZARD_STEPS.map()` 动态渲染
- WIZARD_STEPS 更新后自动显示 4 步
- 无需代码修改

## 决策实现

| 决策 | 描述 | 实现 |
| ---- | ---- | ---- |
| D-01 | 向导 6 步→4 步 | WIZARD_STEPS 更新 |
| D-03 | 解析测试必须通过才能完成 | disabled={!isTestQualified} |
| D-04 | 流程：设置→测试→确认→完成 | 内部状态机 |
| D-05 | 测试未通过时完成按钮禁用 | confirmed 阶段检查 |
| D-08 | 确认页有完成和再次测试按钮 | confirmed 阶段 UI |
| D-09 | 点完成关闭弹窗保存数据 | handleFinish 调用 resetWizard |

## 验证命令

```bash
# 检查 WIZARD_STEPS
grep -A 6 "WIZARD_STEPS" frontend/src/types/ingestion.ts

# 检查 Step4Complete 状态机
grep "ParseTestPanel\|step4Phase" frontend/src/components/ingestion/wizard/Step4Complete.tsx

# 检查 WizardModal 无步骤 5/6
grep "Step5BatchImport\|Step6ParseTest" frontend/src/components/ingestion/wizard/WizardModal.tsx
```

## 备注

- 批量导入作为独立功能（不在弹窗内）将在单独的 phase 中规划
- StepIndicator 无需修改，自动适应 4 步配置

## Self-Check: PASSED

- WIZARD_STEPS 包含 4 个步骤
- Step4Complete 包含 3 个内部阶段
- WizardModal 无 Step5BatchImport 和 Step6ParseTest
- 所有 commit 已创建
