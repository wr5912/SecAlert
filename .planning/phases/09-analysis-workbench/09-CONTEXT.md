# Phase 9: Analysis Workbench - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

交付**智能分析工作台**（Intelligent Analysis Workbench）——一个专业威胁分析平台，帮助运维人员在海量告警中快速定位、理解和处置真实攻击。

**核心能力:**
1. **智能告警中心** — AI 驱动的告警故事线聚合，支持多维度筛选
2. **攻击链路分析画布** — 交互式攻击链路可视化，支持时间轴回放
3. **溯源时间线** — 多轨道事件时间线，跨网络/终端/身份/应用层
4. **威胁狩猎工作台** — 可视化查询构建器，支持检测规则生成
5. **资产上下文面板** — 360° 资产信息穿透
6. **AI 调查助手** — 上下文感知的 AI 辅助分析

**边界:** 这是分析工具，**不包含**自动处置/阻断能力。
</domain>

<decisions>
## Implementation Decisions

### Layout & Navigation
- **D-01:** 路由驱动布局 — 每个视图对应独立路由（`/alerts`, `/graph`, `/timeline`, `/hunting`, `/assets`），支持 deep link 和浏览器前进/后退
- **D-02:** 混合导航折叠 — 默认手动切换侧边栏，屏幕 <1200px 时自动折叠到图标模式（64px）
- **D-03:** 路由跳转详情 — 点击告警/故事线时路由跳转到详情页，不使用 Modal 或 Slide-over

### Attack Graph Canvas
- **D-04:** React Flow — 使用 React Flow 库渲染交互式攻击链路图（节点拖拽、缩放、路径高亮）
- **D-05:** 后端 API 聚合图数据 — 图数据由后端查询 Neo4j 并聚合返回，前端只负责渲染
- **D-06:** 范围滑块时间轴 — 攻击演进时间轴使用范围滑块控制时间窗口

### Storyline Clustering
- **D-07:** 后端聚类计算 — 告警聚类（故事线聚合）在后端（Flink/API）完成，前端只渲染聚类结果
- **D-08:** 全部筛选维度支持 — 告警列表支持：时间范围 + 严重级别 + 资产类型 + ATT&CK 战术 + 置信度评分 + 数据源

### AI Copilot
- **D-09:** Zustand 状态管理 — 使用 Zustand 管理全局分析上下文（包括当前选中的告警/故事线/实体），AI Copilot 订阅上下文变化并自动调整建议
- **D-10:** 多格式导出支持 — 调查完成后支持 PDF + Markdown + JSON 三种格式导出

### Claude's Discretion
- 故事线卡片的默认排序规则（按置信度？按时间？）
- 攻击链路图的默认布局算法（dagre？force-directed？）
- 威胁狩猎查询构建器的具体 SQL/DSL 语法
- 溯源时间线的多轨道默认展开/折叠状态
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend Patterns
- `.planning/codebase/CONVENTIONS.md` — TypeScript 编码规范
- `.planning/codebase/STACK.md` — 技术栈（React, React Flow, Zustand）
- `.planning/phases/09-analysis-workbench/09-UI-SPEC.md` — UI 设计合同（颜色、字体、间距、组件清单）

### Phase Artifacts
- `.planning/phases/09-analysis-workbench/09-FEATURE.md` — 功能规格文档

### Prior Phase Context
- `.planning/PROJECT.md` — 核心价值：帮助非专业运维人员过滤海量告警
- `.planning/REQUIREMENTS.md` — DS/UI/AI/RP 系列需求

### Existing Code
- `frontend/src/components/ChainTimeline.tsx` — 现有时间线组件（参考，非直接复用）
- `frontend/src/components/AlertList.tsx` — 现有告警列表（参考，复用其筛选逻辑模式）
- `frontend/src/components/AlertDetail.tsx` — 现有告警详情（参考）
- `frontend/src/components/ui/` — shadcn UI 组件库（Card, Badge, Button）

### Storage & Data
- `storage/neo4j/` — Neo4j 图数据库 schema 和 Cypher 查询模式
- `parser/dspy/signatures/` — DSPy 签名定义（用于 AI 推理）

### No External Specs
无其他外部 specs — 需求完全从 FEATURE.md 和本文件决策捕获。
</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- **React Flow** — 需通过 npm 安装 `@xyflow/react`（React Flow v12）
- **Zustand** — 需安装 `zustand`，参考现有状态管理模式
- **shadcn/ui** — `Card`, `Badge`, `Button` 组件已在 `frontend/src/components/ui/`
- **date-fns** — 时间轴和相对时间格式化依赖

### Established Patterns
- **筛选逻辑** — `AlertList.tsx` 中已有筛选状态管理，可参考其 `FilterState` 接口定义
- **API 调用** — 使用 `frontend/src/lib/api.ts` 中的 API 客户端模式
- **组件分层** — 展示组件在 `components/`，业务逻辑在 `hooks/`，API 在 `lib/`

### Integration Points
- **路由** — 需要在 `frontend/src/App.tsx` 中添加新路由：`/alerts`, `/graph/:storyId`, `/timeline`, `/hunting`, `/assets/:assetId`
- **API 端点** — 需要新增 API 端点：`GET /api/alerts/clusters`, `GET /api/graph/:storyId`, `GET /api/timeline`
- **Zustand Store** — 新建 `frontend/src/stores/analysis-store.ts` 管理全局分析上下文
</codebase_context>

<specifics>
## Specific Ideas

- **StorylineCard 布局**：置信度标签（红/橙/灰） + 攻击阶段标签 + AI 摘要一行 + 关键指标
- **节点图标**：主机(圆形)、用户(方形)、IP(菱形)、进程(六边形) — React Flow 内置节点形状或自定义 SVG
- **深色主题严格遵循**：#0f172a 背景、#1e293b 卡片、#06b6d4 强调色（FEATURE 和 UI-SPEC 一致）
- **非专业用户友好**：所有 AI 分析结果必须附带"为什么"的解释，不是黑盒输出
</specifics>

<deferred>
## Deferred Ideas

**None — 讨论保持在 phase scope 内。**

所有提出的想法（自动处置、知识库、团队协作）均属于 Phase 10 或未来阶段。
</deferred>

---

*Phase: 09-analysis-workbench*
*Context gathered: 2026-03-26*
