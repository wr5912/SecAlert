# Phase 15: 数据接入用户体验增强 - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning (phase restructure)

<domain>
## Phase Boundary

重构"新建模板"向导弹窗，重整步骤顺序，批量导入移出弹窗，解析测试必须通过才能完成。
</domain>

<decisions>
## Implementation Decisions

### 步骤结构重构
- **D-01:** 向导从 6 步压缩到 **4 步**
- **D-02:** 批量导入**不在弹窗内**，作为独立入口放在「数据接入」页面「新建模板」按钮旁边
- **D-03:** 解析测试必须在点击「完成」前通过

### 新流程（4步）
1. **步骤1**: 选择设备类型（保留现有 Step1DeviceType）
2. **步骤2**: 配置连接参数（保留现有 Step2Connection）
3. **步骤3**: 选择日志格式 + AI自动识别 + 字段映射（保留现有 Step3LogFormat）
4. **步骤4**: 模板设置 + 解析测试（合并，测试通过后显示确认页，点「完成」关闭）

### 步骤4内部行为
- **D-04:** 模板设置（名称等）→ 点击「开始解析测试」→ 解析测试通过 → 显示完成确认页 → 点「完成」关闭弹窗
- **D-05:** 解析测试未通过时，「完成」按钮禁用

### 批量导入（移出弹窗）
- **D-06:** 批量导入作为独立功能，放在「数据接入」页面，与「新建模板」按钮平级
- **D-07:** 批量导入可独立运行，不依赖弹窗状态

### 完成流转
- **D-08:** 解析测试通过后，显示确认页（有「完成」按钮和「再次测试」选项）
- **D-09:** 点击「完成」关闭弹窗，数据保存

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `frontend/src/components/ingestion/wizard/WizardModal.tsx` — 向导容器，需重构步骤数量
- `frontend/src/components/ingestion/wizard/StepIndicator.tsx` — 步骤指示器（已简化为数字横条）
- `frontend/src/components/ingestion/wizard/Step4Complete.tsx` — 现有步骤4，需与解析测试合并
- `frontend/src/components/ingestion/wizard/Step5BatchImport.tsx` — 将被移除（批量导入移出弹窗）
- `frontend/src/components/ingestion/wizard/Step6ParseTest.tsx` — 解析测试，将合并到步骤4
- `frontend/src/types/ingestion.ts` — WIZARD_STEPS 常量需更新
- `.planning/phases/15-data-ingestion-enhancement/15-UI-SPEC.md` — UI 设计契约
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Step1DeviceType`, `Step2Connection`, `Step3LogFormat` — 可直接保留
- `AccuracyBadge`, `ParseTestPanel` — 解析测试组件，移到步骤4内使用
- `AIDetectPanel`, `SampleLogInput`, `FieldMapper` — 步骤3内使用

### Established Patterns
- 使用 `useIngestionStore` (Zustand) 管理向导状态
- `DialogFooter` 条件渲染导航按钮

### Integration Points
- 批量导入：需在 `TemplateCard` 或列表页添加独立入口按钮
- 解析测试合并：ParseTestPanel 嵌入 Step4Complete 或新建合并组件

</code_context>

<deferred>
## Deferred Ideas

### 批量导入作为独立入口
- 放在「数据接入」列表页「新建模板」旁边，需单独计划（future phase）
- 详细产品设计待定
</deferred>
