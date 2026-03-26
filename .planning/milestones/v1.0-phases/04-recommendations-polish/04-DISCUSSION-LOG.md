# Phase 4: Recommendations & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 4-Recommendations & Polish
**Areas discussed:** 推荐策略, 推荐内容风格, 资产引用, UI 默认视图, 单屏设计, 响应流程, 攻击链摘要, ATT&CK 引用, UI 技术栈, 误报恢复

---

## 推荐策略

| Option | Description | Selected |
|--------|-------------|----------|
| 规则模板 + LLM 兜底（推荐） | 与 Phase 1/2/3 的"规则优先 + LLM 兜底"策略一致。预置 ATT&CK 处置模板，未知攻击类型由 Qwen3-32B 生成 | ✓ |
| 纯 LLM 生成 | 所有处置建议都由 Qwen3-32B 根据攻击链上下文生成，最大灵活性但延迟和成本较高 | |
| 纯规则模板 | 全部预置模板，极速但无法应对未知攻击类型，扩展性差 | |

**User's choice:** 规则模板 + LLM 兜底（推荐）
**Notes:** —

---

## 推荐内容风格

| Option | Description | Selected |
|--------|-------------|----------|
| 行动导向一行（推荐） | 类似"隔离该 IP 的网络访问"，一行说明做什么，不解释为什么。适合非专业运维人员，简洁不困惑 | |
| 说明型多行 | "建议隔离该 IP（192.168.1.100），因为它正在对内网进行端口扫描。具体操作：1. 登录防火墙..."—— 含原因、步骤、上下文 | |
| 混合型 | 一行核心行动 + 可展开的详细解释。非专业用户看一行，专家可看详细说明 | ✓ |

**User's choice:** 混合型
**Notes:** 一行核心行动 + 可展开详细说明

---

## 资产引用

| Option | Description | Selected |
|--------|-------------|----------|
| 必须引用（推荐） | 建议必须包含受影响的具体资产信息，如"阻断 192.168.1.100 的 445 端口"，而非"阻断可疑 IP 的 445 端口"。来自 Phase 2 的资产关联数据 | ✓ |
| 可选引用 | 有具体资产信息时引用，没有时用通用描述。实现更复杂，但覆盖更广 | |
| 不引用 | 所有建议使用通用描述，不暴露具体资产信息。简化实现但建议价值降低 | |

**User's choice:** 必须引用（推荐）
**Notes:** —

---

## UI 默认视图

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 Critical + High（推荐） | 符合 ROADMAP 要求：只显示 Critical 和 High。运维人员每天只看真正需要关注的，Medium/Low 可手动展开查看 | ✓ |
| 全部显示（可筛选） | 默认显示所有，运维人员可手动筛选 Critical/High。更多信息但需要主动筛选 | |
| 仅 Critical | 最严格，只看最高等级。High 告警需手动查看。漏报风险低但可能遗漏高危告警 | |

**User's choice:** 只显示 Critical + High。运维人员每天只看真正需要关注的，Medium/Low 可手动展开查看，并且提供筛选功能
**Notes:** —

---

## 单屏设计

| Option | Description | Selected |
|--------|-------------|----------|
| 必须单屏（推荐） | 符合 ROADMAP 要求：告警详情页一眼看到攻击链时间线 + 严重度 + 处置建议 + 一键处置按钮，不需要滚动或跳转页面 | ✓ |
| 可滚动详情页 | 详情页允许滚动，先看摘要，再看攻击链，再看建议。非专业用户可能需要较多滚动，但信息更完整 | |
| 模态弹窗 | 列表页点击告警，弹出一个模态窗口显示详情。不跳页但空间有限 | |

**User's choice:** 必须单屏（推荐）
**Notes:** —

---

## 响应流程

| Option | Description | Selected |
|--------|-------------|----------|
| 一键确认 + 可选备注（推荐） | 每个告警有一个"确认已处理"按钮，点击后记录 timestamp + 操作者。简单直接，符合极简操作原则 | |
| 标准处置流程 | "已阻断"、"已隔离"、"已通报"、"确认为误报"等标准选项 + 备注。规范化但需要选择 | |
| 完全自定义 | 运维人员自由填写处置说明。最大灵活性但增加认知负担，不推荐非专业用户 | |

**User's choice:** 提供"确认已通报"和"确认为误报"+可选备注
**Notes:** 两个选项："确认已通报"和"确认为误报"

---

## 攻击链摘要

| Option | Description | Selected |
|--------|-------------|----------|
| 简化线性时间线（推荐） | 只显示关键节点：攻击源IP → 主要攻击行为 → 受影响资产 → 攻击阶段（如 Reconnaissance → Exploitation）。适合非专业人员的简化视图 | ✓ |
| 完整时间线 | Phase 2 的完整攻击链时间线，包含所有告警节点和时间戳。专家友好但信息量大，可能让非专业人员困惑 | |
| 可切换视图 | 默认简化视图，点击切换到完整时间线。兼顾两类用户但实现复杂度更高 | |

**User's choice:** 简化线性时间线（推荐）
**Notes:** —

---

## ATT&CK 引用

| Option | Description | Selected |
|--------|-------------|----------|
| 不引用（推荐） | 非专业运维人员不需要看到 ATT&CK 术语。处置建议只显示通俗行动描述，不显示 T1190 等技术编号 | |
| 可选显示 | 默认不显示，点击"技术详情"展开 ATT&CK 引用。需要在简洁性和信息完整性之间做权衡 | ✓ |
| 必须引用 | 所有建议必须包含 ATT&CK 技术编号。符合安全行业标准，但非专业人员可能看不懂 | |

**User's choice:** 可选显示
**Notes:** —

---

## UI 技术栈

| Option | Description | Selected |
|--------|-------------|----------|
| 简单 HTML + Vanilla JS（推荐） | 最简单实现，直接调用 FastAPI 获取 JSON 数据，前端零框架。快速交付，极简界面，适合 Phase 4 的"极简操作"目标 | |
| Vue 3 | 主流前端框架，组件化开发，适合长期维护。但增加开发复杂度 | |
| React | 生态丰富，但同样增加技术栈复杂度。对于简单的运营界面可能过度设计 | ✓ |

**User's choice:** React
**Notes:** —

---

## 误报恢复

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 UI 中集成恢复功能（推荐） | 在告警列表中提供"已抑制告警"入口，运维可查看并恢复误报。与 Phase 3 的 restore_chain API 打通 | ✓ |
| 仅 Phase 3 API 恢复 | 误报恢复只能通过 Phase 3 的 REST API 操作，Phase 4 UI 不提供此入口。简化 Phase 4 范围 | |
| 独立恢复界面 | Phase 4 提供独立的"误报恢复"界面，与正常告警列表分开 | |

**User's choice:** Phase 4 UI 中集成恢复功能（推荐）
**Notes:** —

---

## Claude's Discretion

- ATT&CK 处置建议模板库的具体内容（按 Technique 积累）
- React 组件结构设计（列表组件、详情单屏组件、时间线组件）
- 简化时间线的数据转换逻辑（从 Phase 2 完整数据提取关键节点）
- 建议可展开详情的交互方式（折叠面板、Tooltip、还是 Modal）

## Deferred Ideas

None — discussion stayed within phase scope
