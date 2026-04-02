---
phase: 15
reviewers: [claude]
reviewed_at: 2026-04-02
plans_reviewed: [15-01-PLAN.md, 15-02-PLAN.md, 15-03-PLAN.md, 15-04-PLAN.md, 15-05-PLAN.md, 15-06-PLAN.md]
---

# Cross-AI Plan Review — Phase 15

## Claude Review

### 1. Summary

Phase 15 plans实现数据接入用户体验增强，包含AI自动识别日志格式(DI-07)、可视化字段映射、批量接入(DI-08)、解析测试(DI-09)四个主要功能。整体架构设计合理，采用DSPy Signature驱动AI识别、@dnd-kit实现拖拽式字段映射、xlsx解析批量导入文件。验证报告显示核心功能已实现，但存在DSPy fallback行为、templateId未连接、按钮无操作三个gap，plan 15-05和15-06针对性修复这些gap。依赖链清晰(Wave 2依赖Wave 1)，但计划间交互存在潜在集成风险。

### 2. Strengths

- **OCSF归一化设计完整**: Plan 15-01详细定义了CEF→OCSF映射规范(src_endpoint.ip, dst_endpoint.port, observables等)，符合项目异构日志归一化目标
- **用户体验流程连贯**: 从AI识别→字段映射→批量导入→解析测试的四步流程设计清晰，每步都有明确的完成标准
- **技术选型合理**: xlsx库已存在，@dnd-kit是React拖拽生态最佳选择，DSPy Signature提供类型安全的LLM调用抽象
- **Gap closure机制有效**: 验证报告准确识别了三个gap，plan 15-05针对性修复
- **准确率阈值明确**: 85%阈值作为达标标准，可配置(PARSE_MIN_CONFIDENCE环境变量)
- **反模式识别**: 研究文档总结了三个常见陷阱，有助于预防问题

### 3. Concerns

**HIGH**

1. **OCSF映射方向不一致**: Plan 15-01定义的`ocsf_field_mappings`是`{OCSF字段: 源字段}`，但Plan 15-02的FieldMapper使用`{sourceField: targetField}`格式，两者方向相反

2. **Plan 15-02和15-05的store状态定义冲突**: Plan 15-02要求store添加`parsePreviewResult`状态，但Plan 15-05没有明确这个状态是否存在

3. **AI识别后自动保存模板的templateId传递时序**: AIDetectPanel的onSuccess异步调用API保存模板，但MappingPreview立即需要这个templateId，存在race condition

**MEDIUM**

4. **detected_fields字段缺失**: API响应`LogFormatRecognitionResponse`缺少`detected_fields`字段，FieldMapper左侧源字段列表数据来源不明确

5. **Preview-parse端点实现单薄**: stub实现需要替换为真实ThreeTierParser调用

6. **批量导入的错误处理粒度不足**: 没有重试机制、并发限制或部分成功处理

7. **WizardModal 6步骤状态管理复杂**: 6个步骤的导航状态、数据保持等问题在计划中没有明确说明

**LOW**

8. **CSV/Excel文件大小限制缺失**: 大文件可能导致前端解析卡顿

9. **Step5和Step6的batchDevices状态连接**: batch导入的设备如何传递给Step6使用?计划没有说明

10. **Plan 15-06的验证脚本不正确**: grep会匹配到已有的DI-01~DI-06，导致计数不准确

### 4. Suggestions

1. **统一field_mappings语义**: 明确定义方向，添加`detected_fields: List[str]`字段

2. **解决templateId race condition**: 使用`await`确保模板保存完成后再触发后续UI更新

3. **补充preview-parse实现**: 替换stub为真实ThreeTierParser调用

4. **增强批量导入错误处理**: 添加单条失败不影响其他设备的策略

5. **明确Step间数据传递**: 补充batch导入设备列表如何被Step6使用

6. **添加文件大小验证**: 建议MAX_SIZE设为5MB

### 5. Risk Assessment

| 维度 | 评分 | 说明 |
|------|------|------|
| 整体风险 | **MEDIUM** | 核心功能已实现，gap修复计划明确，但集成风险存在 |
| OCSF映射不一致 | **HIGH** | Plan 15-01和15-02的field_mappings方向冲突，需要对齐 |
| templateId race condition | **MEDIUM** | 异步模板保存与预览渲染的时序问题可能导致用户体验断点 |
| Preview-parse实现不完整 | **MEDIUM** | stub实现会影响字段映射实时预览功能 |
| 批量导入扩展性 | **LOW** | 缺少重试和并发控制，但当前规模(10-100设备)可接受 |
| 依赖链健康度 | **LOW** | Wave 2正确依赖Wave 1，计划间依赖清晰 |

**建议优先修复**: OCSF映射方向冲突和templateId时序问题，这两个会影响核心用户体验流程。

---

## Consensus Summary

*Note: Only Claude review was available. Codex authentication failed.*

### Key Findings

**Agreed Strengths:**
- OCSF归一化设计完整
- 用户体验流程连贯
- 技术选型合理
- Gap closure机制有效
- 准确率阈值明确

**High Priority Concerns:**
1. OCSF映射方向不一致 (field_mappings语义冲突)
2. templateId异步传递的race condition
3. detected_fields字段缺失导致数据来源不明确

**Action Items for Planning:**
1. 统一field_mappings的语义方向
2. 确保templateId在异步保存后正确传递给MappingPreview
3. 添加detected_fields字段到LogFormatRecognitionResponse
4. 完善preview-parse端点的stub实现
5. 明确Step间数据流传递

---

*Review completed at 2026-04-02*
*To incorporate feedback into planning: /gsd:plan-phase 15 --reviews*
