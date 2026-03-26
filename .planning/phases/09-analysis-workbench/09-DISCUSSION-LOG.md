# Phase 9: Analysis Workbench - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 09-analysis-workbench
**Areas discussed:** Layout & Navigation, Attack Graph Implementation, Storyline Clustering, AI Copilot Integration

---

## Gray Area 1: Layout & Navigation Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| 路由驱动布局 | 每个视图对应独立路由，状态管理清晰，可 deep link | ✓ |
| 状态驱动布局 | SPA 内切换，状态共享，切换流畅 | |
| 混合方案 | 路由管理视图切换，状态驱动画布内布局变化 | |

**User's choice:** 路由驱动布局
**Notes:** 适合专业分析工具，URL 可分享，支持浏览器前进/后退

---

| Option | Description | Selected |
|--------|-------------|----------|
| 手动切换 | 用户点击按钮切换，保留用户控制 | |
| 视口自适应（<1200px） | 窄屏自动折叠到图标模式，宽屏保持展开 | |
| 混合模式 | 默认手动切换，屏幕 <1200px 时自动触发 | ✓ |

**User's choice:** 混合模式
**Notes:** 兼顾用户控制和窄屏适配

---

| Option | Description | Selected |
|--------|-------------|----------|
| 路由跳转 | 完整分析流程，URL 可分享，适合深度分析 | ✓ |
| Modal 弹窗 | 快速浏览，不丢失列表上下文 | |
| Slide-over 侧边面板 | 详情滑出，列表仍在背景，适合对比分析 | |

**User's choice:** 路由跳转
**Notes:** 完整分析流程需要独立的 URL 上下文

---

## Gray Area 2: Attack Graph Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| visx | React + D3 hooks，平衡灵活性与 React 生态集成度 | |
| D3.js 原生 | 完全控制，但与 React 状态管理可能有摩擦 | |
| React Flow | 专用节点图库，内置节点/边/布局算法，开箱即用 | ✓ |
| 扩展 ChainTimeline | 基于 ChainTimeline.tsx 改造，复用现有代码 | |

**User's choice:** React Flow
**Notes:** 开箱即用的节点/边/布局算法，减少开发成本

---

| Option | Description | Selected |
|--------|-------------|----------|
| 后端 API 聚合 | 后端查询 Neo4j 并返回图数据，前端只负责渲染 | ✓ |
| 前端直接查询 Neo4j | 绕过 API 层，减少延迟，但暴露数据库连接 | |

**User's choice:** 后端 API 聚合
**Notes:** API 可做权限控制、缓存、分页，数据安全

---

| Option | Description | Selected |
|--------|-------------|----------|
| 范围滑块 | 拖拽起止范围选择时间段，直观简单 | ✓ |
| 播放控制条 | 播放/暂停/步进，逐个展示攻击阶段演进 | |
| 双滑块 | 精确控制时间窗口，两端可独立拖拽 | |

**User's choice:** 范围滑块
**Notes:** 适合非专业用户，直观简单

---

## Gray Area 3: Storyline Clustering Logic

| Option | Description | Selected |
|--------|-------------|----------|
| 后端聚类 | 后端预计算，前端只渲染结果，支持大规模数据 | ✓ |
| 前端聚类 | 浏览器内实时计算，适合小数据集（<1000条） | |
| 混合架构 | 后端预聚类 + 前端微调分组 | |

**User's choice:** 后端聚类
**Notes:** 3万+告警规模必须后端计算

---

| Option | Description | Selected |
|--------|-------------|----------|
| 全部支持 | 时间范围 + 严重级别 + 资产类型 + ATT&CK 战术 + 置信度 + 数据源 | ✓ |
| 核心子集 | 严重级别 + 置信度 + ATT&CK 战术（最常用） | |
| 仅严重级别+时间 | 最简化，非专业用户不需要复杂筛选 | |

**User's choice:** 全部支持
**Notes:** 专业分析工作台需要完整筛选能力

---

## Gray Area 4: AI Copilot Integration

| Option | Description | Selected |
|--------|-------------|----------|
| 全局 Context 广播 | React Context 广播当前分析上下文，AI Copilot 自动响应变化 | |
| Props Drilling | 显式 props 传递，状态变化显式可控 | |
| Zustand 状态管理 | 专用状态管理库，性能好，支持持久化分析历史 | ✓ |

**User's choice:** Zustand 状态管理
**Notes:** 性能好，支持持久化分析历史，方便调试

---

| Option | Description | Selected |
|--------|-------------|----------|
| PDF + JSON 结构化 | PDF 人类可读报告 + JSON 结构化数据 | |
| 仅 PDF | 最简单，但无法与下游系统集成 | |
| PDF + Markdown + JSON | 三格式全支持，最大灵活性 | ✓ |

**User's choice:** PDF + Markdown + JSON
**Notes:** 最大灵活性，满足不同场景需求

---

## Claude's Discretion

以下方面用户选择由 Claude (planner/researcher) 决定：
- 故事线卡片的默认排序规则（按置信度？按时间？）
- 攻击链路图的默认布局算法（dagre？force-directed？）
- 威胁狩猎查询构建器的具体 SQL/DSL 语法
- 溯源时间线的多轨道默认展开/折叠状态

## Deferred Ideas

无 scope creep 情况——所有讨论保持在 Phase 9 scope 内。

用户提到但未深入讨论的想法：
- 团队协作（共享分析会话）→ 属于 Phase 10
- 自动处置阻断 → 明确超出 scope（系统定位为分析工具）
