---
phase: 15
slug: data-ingestion-enhancement
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-04-02
updated: 2026-04-02
---

# Phase 15 — UI Design Contract

> Visual and interaction contract for Phase 15 data ingestion enhancement features.
> Extends existing WizardModal (4-step) with AI Auto-Detect, Visual Field Mapping, Batch Import, and Parse Testing.
> This is an updated contract reflecting implementation state and identified optimization opportunities.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui | components.json |
| Preset | base-nova | npx shadcn info |
| Component library | @radix-ui/react-* | shadcn official |
| Icon library | lucide-react | existing |
| Font | IBM Plex Sans (body), Space Grotesk (heading), JetBrains Mono (mono) | tailwind.config.js |
| Tailwind version | v3 | existing project |

---

## Spacing Scale

继承现有 8-point scale：

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

**Exceptions for Phase 15:**
- 拖拽字段最小触摸目标: 44px (符合无障碍标准)
- 批量导入表格行高: 48px (确保可读性)

---

## Typography

继承现有 typography 系统：

| Role | Size | Weight | Line Height | Source |
|------|------|--------|-------------|--------|
| Body | 16px (1rem) | 400 | 1.6 | index.css body |
| Label | 14px (0.875rem) | 500 | 1.5 | existing form labels |
| Heading | 20px (1.25rem) | 600 | 1.4 | tailwind heading |
| Display | 28px (1.75rem) | 600 | 1.3 | Step titles |

**Phase 15 specific:**
- AI 识别结果展示: 14px monospace (JetBrains Mono) — 复用 Label 尺寸，monospace font-family 区分
- 字段映射标签: 14px medium — 复用 Label 尺寸
- 解析准确率数字: 28px display — 复用 Display 尺寸

---

## Color

继承现有 Tactical Command Center 配色：

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #0a0f1a | 页面背景 |
| Secondary (30%) | #111827 | 卡片、表面 |
| Accent (10%) | #00f0ff | 交互元素、强调 |
| Destructive | #ff2d55 | 危险操作 |

**Accent 保留元素 (Phase 15):**
- AI 识别按钮
- 拖拽字段高亮
- 解析成功状态
- 准确率达标指示

**Phase 15 新增语义色:**
| 色值 | 用途 |
|------|------|
| #10b981 (success) | 解析成功、字段匹配成功 |
| #f59e0b (warning) | 准确率警告 (70-85%) |
| #ff2d55 (destructive) | 解析失败、删除设备 |

---

## Copywriting Contract

| Element | Copy | Notes |
|---------|------|-------|
| Primary CTA | 开始识别 | AI 自动识别入口 |
| Secondary CTA | 应用映射 | 字段映射确认 |
| Tertiary CTA | 批量导入 | 批量导入入口 |
| Step5 Skip CTA | 跳过批量导入 | 批量导入为可选步骤 |
| Empty state heading | 暂无示例日志 | 无日志输入时 |
| Empty state body | 请粘贴 3-5 条示例日志，系统将自动识别格式和字段 | |
| Error state | 识别失败：请检查日志格式或尝试手动映射 | AI 识别失败 |
| Batch import empty | 尚未选择文件 | |
| Batch import error | 文件格式错误：仅支持 .csv 和 .xlsx | |
| Parse test heading | 解析测试结果 | |
| Parse success | 解析成功 (n/m) | |
| Parse failure | 解析失败 (n/m) | |
| Accuracy达标 | 准确率 85% 以上，配置可用 | 阈值可配置 |
| Accuracy未达标 | 准确率未达标，请调整字段映射 | |
| Step6 finish disabled | 请先通过解析测试 | 未达标时禁用完成按钮 |

**Destructive actions:**
- 删除设备 (批量): 需二次确认对话框
- 清除映射: 无需确认（可撤销）

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | button, dialog, input, select, tooltip, textarea, progress, badge, table | not required |
| @dnd-kit (new) | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities | npm install only, no third-party registry |

**Third-party registry vetting:** N/A — @dnd-kit is a trusted npm package, not a shadcn registry block.

---

## Component Inventory

### New Components (Phase 15)

| Component | Purpose | States |
|-----------|---------|--------|
| AIDetectPanel | AI 自动识别面板 | idle, loading, success, error |
| SampleLogInput | 示例日志输入区 | empty, filled, error |
| FieldMapper | 拖拽式字段映射器 | unmapped, mapping, mapped |
| DraggableField | 可拖拽字段项 | default, dragging, mapped |
| MappingPreview | 映射结果预览 | empty, parsing, success, error |
| BatchImportModal | 批量导入对话框 | closed, file-select, parsing, complete, error |
| ParseTestPanel | 解析测试面板 | idle, testing, success, failure |
| AccuracyBadge | 准确率徽章 | 达标 (>85%), 警告 (70-85%), 未达标 (<70%) |
| DeviceTable | 批量设备表格 | normal, selected, error |
| Step5BatchImport | 批量导入步骤入口 | default, imported |
| Step6ParseTest | 解析测试步骤 | idle, qualified, unqualified |

### Extended Components

| Component | Extension |
|-----------|-----------|
| WizardModal | 新增 Step5BatchImport, Step6ParseTest 步骤 |
| Step3LogFormat | 新增 AI 识别入口和字段映射功能 |
| StepIndicator | 支持 6 步显示 |

---

## Interaction Patterns

### AI Auto-Detect Flow
1. 用户粘贴 3-5 条示例日志
2. 点击"开始识别"按钮
3. 显示 loading 状态 (按钮变为加载中)
4. 成功：显示识别结果 (格式、正则、字段映射)，高亮置信度
5. 失败：显示错误信息，提示用户手动映射

### Visual Field Mapping Flow
1. 左侧：检测到的源字段 (可拖拽)
2. 右侧：目标标准字段 (下拉选择)
3. 拖拽源字段到目标区域
4. 实时预览解析结果
5. 点击"应用映射"确认

### Batch Import Flow
1. 点击"批量导入"打开对话框
2. 拖拽或选择 CSV/Excel 文件
3. 预览解析结果 (表格形式)
4. 确认导入
5. 显示导入结果 (成功数、失败数)

### Parse Testing Flow
1. 选择或粘贴测试日志
2. 点击"开始测试"
3. 显示进度条
4. 返回准确率统计
5. 达标：启用"完成"按钮
6. 未达标：提示调整映射

---

## WizardModal Flow (6-Step)

### Step Titles (使用 WIZARD_STEPS)
```
1: 设备类型
2: 连接参数
3: 日志格式
4: 模板设置
5: 批量导入
6: 完成
```

### Footer Navigation Rules
- **Steps 1-4**: 标准 footer (上一步 + 下一步 + 取消)
- **Step 5 (批量导入)**: Footer 包含"跳过批量导入"按钮 (批量导入为可选步骤)
- **Step 6 (完成)**: 无标准 footer，步骤内自行处理完成逻辑

### Validation Rules (canGoNext)
| Step | Validation | Notes |
|------|------------|-------|
| 1 | !!deviceType | 需选择设备类型 |
| 2 | !!connection | 需配置连接参数 |
| 3 | !!logFormat | 需选择日志格式 |
| 4 | true | Step4 有独立的完成按钮 |
| 5 | true | 批量导入可选 |

### Navigation State
- Step 6 ParseTest 完成测试后，`isTestQualified` 为 true 时启用"完成"按钮
- Step 6 finish 按钮文字：`{isLoading ? '处理中...' : isTestQualified ? '完成' : '请先通过解析测试'}`

---

## Optimization Opportunities

以下问题已在实现中发现，需要在后续优化中修复：

### 1. WizardModal Footer 条件不一致
**问题**: `!isEditMode && step < 5` 条件导致 Step5 没有标准 footer 按钮
**建议**: Step5 应显示"跳过批量导入"按钮，允许用户跳过可选的批量导入步骤

### 2. canGoNext() Step 4 返回 false
**问题**: canGoNext 对 step 4 返回 false，但 Step4 有独立的完成按钮，导致逻辑不一致
**建议**: canGoNext(4) 应返回 true，或将 Step4 的完成逻辑移入 footer

### 3. stepTitles 重复定义
**问题**: WizardModal 内定义的 stepTitles 与 WIZARD_STEPS 常量重复
**建议**: 使用 `WIZARD_STEPS.find(s => s.num === step)?.label` 获取标题

### 4. Step5 跳过逻辑缺失
**问题**: 用户点击"跳过批量导入"后应直接进入 Step6，但目前无此逻辑
**建议**: 在 WizardModal footer 为 Step5 添加"跳过"按钮，调用 `nextStep()` 进入 Step6

---

## Technical Notes

### Dependencies
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (新增)
- xlsx (已存在，用于 CSV/Excel 解析)

### File Structure
```
frontend/src/components/ingestion/
├── wizard/
│   ├── WizardModal.tsx           # 6步向导容器
│   ├── StepIndicator.tsx         # 步骤指示器
│   ├── Step1DeviceType.tsx       # 设备类型选择
│   ├── Step2Connection.tsx      # 连接参数配置
│   ├── Step3LogFormat.tsx        # 日志格式 + AI 识别
│   ├── Step4Complete.tsx         # 模板确认与创建
│   ├── Step5BatchImport.tsx      # 批量导入入口
│   ├── Step6ParseTest.tsx       # 解析测试步骤
│   ├── AIDetectPanel.tsx         # AI 识别面板
│   ├── SampleLogInput.tsx        # 示例日志输入
│   ├── AccuracyBadge.tsx         # 准确率徽章
│   ├── ParseTestPanel.tsx       # 解析测试面板
│   ├── BatchImportModal.tsx      # 批量导入对话框
│   ├── DeviceTable.tsx           # 设备表格
│   └── FieldMapping/
│       ├── FieldMapper.tsx       # 拖拽映射主组件
│       ├── DraggableField.tsx    # 可拖拽字段
│       └── MappingPreview.tsx    # 实时预览
```

### State Management
- 扩展 useIngestionStore (Zustand)
- 新增字段: sampleLogs, fieldMappings, batchDevices, parseTestResults, batchImportResult, batchCreatedTemplateIds, selectedTemplateIdForTest, parseTestResult, isTestQualified

---

## Focal Point
- Primary: SampleLogInput area (示例日志输入区) — 页面加载时的视觉焦点

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS (focal point declared)
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS (consolidated to 4 sizes)
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
