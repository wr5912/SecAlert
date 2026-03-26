---
phase: 9
slug: analysis-workbench
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (已在项目中配置) |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-W0-01 | W0 | 0 | 依赖安装 @xyflow/react dagre | unit | `npm list @xyflow/react dagre` | N/A | ⬜ pending |
| 9-W0-02 | W0 | 0 | analysis.ts 类型定义 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-03 | W0 | 0 | analysisStore.ts Zustand store | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-04 | W0 | 0 | analysisEndpoints.ts API 客户端 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-05 | W0 | 0 | StorylineCard.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-06 | W0 | 0 | StorylineList.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-07 | W0 | 0 | AttackGraph.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-08 | W0 | 0 | Timeline.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-09 | W0 | 0 | NavSidebar.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-10 | W0 | 0 | AIPanel.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-11 | W0 | 0 | ContextPanel.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-12 | W0 | 0 | HuntingWorkbench.tsx 组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-W0-13 | W0 | 0 | tests/analysis/ 测试目录 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-01-01 | 01 | 1 | 路由配置 (D-01) | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | AnalysisShell 布局组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | NavSidebar 导航组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | StorylineCard 故事线卡片 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | StorylineList 故事线列表 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-02-03 | 02 | 2 | AlertCenterPage 告警中心页面 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-03-01 | 03 | 3 | AttackGraph 攻击图 React Flow | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-03-02 | 03 | 3 | AttackGraphPage 攻击图页面 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-04-01 | 04 | 4 | Timeline 多轨道时间线组件 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-04-02 | 04 | 4 | TimelinePage 时间线页面 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-05-01 | 05 | 5 | QueryBuilder 查询构建器 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-05-02 | 05 | 5 | HuntingPage 狩猎页面 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-06-01 | 06 | 6 | ContextPanel 上下文面板 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-06-02 | 06 | 6 | AssetContextPage 资产页面 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-07-01 | 07 | 7 | AIPanel AI Copilot 面板 | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-08-01 | 08 | 8 | Zustand analysisStore (已 W0) | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-08-02 | 08 | 8 | analysisEndpoints API (已 W0) | unit | `npm run test -- --run` | W0 | ⬜ pending |
| 9-09-01 | 09 | 9 | analysis.ts 类型定义 (已 W0) | unit | `npm run test -- --run` | W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 是独立执行的基础设施任务，为后续所有 Wave 提供依赖。

### W0-01: 依赖安装

**文件:** `frontend/package.json`

**action:**
```bash
cd frontend && npm install @xyflow/react dagre @types/dagre
```

**verify:**
<automated>npm list @xyflow/react dagre</automated>

**done:** package.json 包含 @xyflow/react 和 dagre 依赖

---

### W0-02: 分析模块类型定义

**文件:** `frontend/src/types/analysis.ts`

**action:**
创建以下类型导出：
- Storyline, StorylineFilters
- AttackNode, AttackEdge
- TimelineEvent
- Severity 枚举

**verify:**
<automated>test -f frontend/src/types/analysis.ts && grep -q "export interface Storyline" frontend/src/types/analysis.ts</automated>

**done:** 文件存在且包含所有必需类型定义

---

### W0-03: Zustand 分析 Store

**文件:** `frontend/src/stores/analysisStore.ts`

**action:**
创建 Zustand store，导出：
- AnalysisState 接口
- useAnalysisStore hook
- Actions: setCurrentView, selectStoryline, selectEntity, setTimeRange, updateFilters

**verify:**
<automated>test -f frontend/src/stores/analysisStore.ts && grep -q "useAnalysisStore" frontend/src/stores/analysisStore.ts</automated>

**done:** Store 文件存在且导出 useAnalysisStore

---

### W0-04: 分析 API 客户端

**文件:** `frontend/src/api/analysisEndpoints.ts`

**action:**
创建 API 函数：
- fetchStorylines(filters)
- fetchAttackGraph(storylineId, timeRange)
- fetchTimeline(timeRange, sources)
- fetchAssetContext(assetId)
- fetchHuntingResults(query)

**verify:**
<automated>test -f frontend/src/api/analysisEndpoints.ts && grep -q "fetchStorylines" frontend/src/api/analysisEndpoints.ts</automated>

**done:** API 端点文件存在且包含所有函数签名

---

### W0-05: StorylineCard 组件骨架

**文件:** `frontend/src/components/analysis/StorylineCard.tsx`

**action:**
创建组件骨架：
- StorylineCardProps 接口
- 默认导出函数组件
- 基础结构（置信度、攻击阶段、摘要、指标占位）

**verify:**
<automated>test -f frontend/src/components/analysis/StorylineCard.tsx</automated>

**done:** 组件文件存在

---

### W0-06: StorylineList 组件骨架

**文件:** `frontend/src/components/analysis/StorylineList.tsx`

**action:**
创建组件骨架：
- 列表结构（左侧聚类面板 + 中央详情区）
- 筛选状态管理占位
- 加载/空状态占位

**verify:**
<automated>test -f frontend/src/components/analysis/StorylineList.tsx</automated>

**done:** 组件文件存在

---

### W0-07: AttackGraph 组件骨架

**文件:** `frontend/src/components/analysis/AttackGraph.tsx`

**action:**
创建 React Flow 组件骨架：
- 导入 ReactFlow, Controls, MiniMap
- nodeTypes 和 edgeTypes 配置占位
- dagre 布局配置占位

**verify:**
<automated>test -f frontend/src/components/analysis/AttackGraph.tsx</automated>

**done:** 组件文件存在

---

### W0-08: Timeline 组件骨架

**文件:** `frontend/src/components/analysis/Timeline.tsx`

**action:**
创建多轨道时间线组件骨架：
- 4 个轨道配置（network, endpoint, identity, application）
- 事件卡片占位
- 展开/折叠逻辑占位

**verify:**
<automated>test -f frontend/src/components/analysis/Timeline.tsx</automated>

**done:** 组件文件存在

---

### W0-09: NavSidebar 组件骨架

**文件:** `frontend/src/components/analysis/NavSidebar.tsx`

**action:**
创建导航组件骨架：
- 4 个导航项配置
- 折叠状态逻辑占位
- NavLink 路由占位

**verify:**
<automated>test -f frontend/src/components/analysis/NavSidebar.tsx</automated>

**done:** 组件文件存在

---

### W0-10: AIPanel 组件骨架

**文件:** `frontend/src/components/analysis/AIPanel.tsx`

**action:**
创建 AI Copilot 面板骨架：
- 消息输入占位
- 智能推荐区域占位
- 上下文订阅逻辑占位

**verify:**
<automated>test -f frontend/src/components/analysis/AIPanel.tsx</automated>

**done:** 组件文件存在

---

### W0-11: ContextPanel 组件骨架

**文件:** `frontend/src/components/analysis/ContextPanel.tsx`

**action:**
创建资产上下文面板骨架：
- 3 个标签页结构（asset, threat_intel, behavior）
- 动态数据加载占位

**verify:**
<automated>test -f frontend/src/components/analysis/ContextPanel.tsx</automated>

**done:** 组件文件存在

---

### W0-12: HuntingWorkbench 组件骨架

**文件:** `frontend/src/components/analysis/HuntingWorkbench.tsx`

**action:**
创建威胁狩猎工作台骨架：
- QueryBuilder 集成占位
- 结果展示区域占位

**verify:**
<automated>test -f frontend/src/components/analysis/HuntingWorkbench.tsx</automated>

**done:** 组件文件存在

---

### W0-13: 测试目录创建

**文件:** `frontend/tests/analysis/`

**action:**
创建测试目录和基础测试文件：
- `frontend/tests/analysis/.gitkeep`
- `frontend/tests/analysis/setup.ts` (Vitest 配置)

**verify:**
<automated>test -d frontend/tests/analysis</automated>

**done:** 测试目录存在

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 攻击链路图交互 (拖拽/缩放) | D-04 React Flow | 需要浏览器交互验证 | 手动测试节点拖拽、缩放、选择操作 |
| 时间轴拖拽 (范围滑块时间轴控制器) | D-06 范围滑块 | 需要浏览器交互验证 | 手动测试滑块拖拽和时间范围更新 |
| 侧边栏折叠 (<1200px) | D-02 混合折叠 | 视口相关 | 手动测试不同视口宽度下的折叠行为 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (13 W0 tasks listed)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
