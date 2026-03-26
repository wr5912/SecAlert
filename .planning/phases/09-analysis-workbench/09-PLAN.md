---
phase: 09-analysis-workbench
plan: 01
type: feature
wave: 0
depends_on: []
files_modified:
  - frontend/package.json
  - frontend/src/App.tsx
  - frontend/src/types/analysis.ts
  - frontend/src/stores/analysisStore.ts
  - frontend/src/api/analysisEndpoints.ts
  - frontend/src/components/analysis/StorylineCard.tsx
  - frontend/src/components/analysis/StorylineList.tsx
  - frontend/src/components/analysis/AttackGraph.tsx
  - frontend/src/components/analysis/Timeline.tsx
  - frontend/src/components/analysis/NavSidebar.tsx
  - frontend/src/components/analysis/AIPanel.tsx
  - frontend/src/components/analysis/ContextPanel.tsx
  - frontend/src/components/analysis/HuntingWorkbench.tsx
  - frontend/src/components/analysis/AnalysisShell.tsx
  - frontend/src/components/analysis/QueryBuilder.tsx
autonomous: false
must_haves:
  truths:
    - "用户可以通过故事线置信度排序快速识别高危告警"
    - "用户可以通过交互式攻击链路图理解攻击路径"
    - "用户可以通过多轨道时间线追溯攻击演进"
    - "非专业用户可以通过三元组查询构建器进行威胁狩猎"
    - "AI 建议附带推理过程解释"
  artifacts:
    - path: "frontend/src/components/analysis/AttackGraph.tsx"
      provides: "交互式攻击链路可视化"
      min_lines: 100
    - path: "frontend/src/components/analysis/StorylineList.tsx"
      provides: "AI 驱动的告警故事线聚合"
      exports: ["StorylineCard", "StorylineFilters"]
    - path: "frontend/src/stores/analysisStore.ts"
      provides: "全局分析上下文状态管理"
      exports: ["useAnalysisStore"]
    - path: "frontend/src/api/analysisEndpoints.ts"
      provides: "分析模块 API 客户端"
      exports: ["fetchStorylines", "fetchAttackGraph", "fetchTimeline"]
  key_links:
    - from: "frontend/src/components/analysis/StorylineCard.tsx"
      to: "frontend/src/pages/AttackGraphPage.tsx"
      via: "React Router navigate"
      pattern: "navigate.*graph"
    - from: "frontend/src/stores/analysisStore.ts"
      to: "frontend/src/components/analysis/AIPanel.tsx"
      via: "Zustand subscription"
      pattern: "useAnalysisStore"
---

# Phase 9 — 智能分析工作台 实施计划

**目标:** 构建专业威胁分析工作台，帮助运维人员快速定位、理解和处置真实攻击。

**核心能力:**
1. 智能告警中心 — AI 驱动的告警故事线聚合
2. 攻击链路分析画布 — 交互式攻击链路可视化
3. 溯源时间线 — 多轨道事件时间线
4. 威胁狩猎工作台 — 可视化查询构建器
5. 资产上下文面板 — 360度资产信息
6. AI 调查助手 — 上下文感知 AI 辅助分析

**依赖:** Phase 8 报表完成

---

## Wave 0 — 基础设施准备 (2026-03-26)

Wave 0 创建所有组件骨架和基础设施，为后续 Wave 提供依赖。这些任务可并行执行。

<task>
<name>Task W0-01: 依赖安装</name>
<files>frontend/package.json</files>
<action>
执行以下命令安装 React Flow 和 dagre 布局库：
```bash
cd frontend && npm install @xyflow/react dagre @types/dagre
```
</action>
<verify>
<automated>npm list @xyflow/react dagre</automated>
</verify>
<done>package.json 包含 @xyflow/react 和 dagre 依赖</done>
</task>

<task>
<name>Task W0-02: 分析模块类型定义</name>
<files>frontend/src/types/analysis.ts</files>
<action>
创建以下类型导出：
- `Storyline` — 包含 id, confidence, attackPhase, summary, assetCount, firstActivity, lastActivity, threatIntelMatch, alerts
- `StorylineFilters` — 包含 timeRange, severities, assetTypes, mitreTactics, confidenceRange, sources
- `AttackNode` — 包含 id, type (host|user|ip|process), label, severity, data
- `AttackEdge` — 包含 id, source, target, type (confirmed|suspected), animated
- `TimelineEvent` — 包含 id, timestamp, layer (network|endpoint|identity|application), source, eventType, rawLog, entities, isAnomaly
- `Severity` 枚举
</action>
<verify>
<automated>test -f frontend/src/types/analysis.ts && grep -q "export interface Storyline" frontend/src/types/analysis.ts && grep -q "export interface AttackNode" frontend/src/types/analysis.ts</automated>
</verify>
<done>文件存在且包含所有必需类型定义（Storyline, AttackNode, AttackEdge, TimelineEvent, StorylineFilters）</done>
</task>

<task>
<name>Task W0-03: Zustand 分析 Store</name>
<files>frontend/src/stores/analysisStore.ts</files>
<action>
创建 Zustand store，导出：
- `AnalysisState` 接口 — currentView, selectedStorylineId, selectedEntityId, selectedEntityType, timeRange, filters, copilotOpen, copilotContext
- `useAnalysisStore` hook — 包含 persist middleware
- Actions: setCurrentView, selectStoryline, selectEntity, setTimeRange, updateFilters
</action>
<verify>
<automated>test -f frontend/src/stores/analysisStore.ts && grep -q "useAnalysisStore" frontend/src/stores/analysisStore.ts && grep -q "create" frontend/src/stores/analysisStore.ts</automated>
</verify>
<done>Store 文件存在且导出 useAnalysisStore hook</done>
</task>

<task>
<name>Task W0-04: 分析 API 客户端</name>
<files>frontend/src/api/analysisEndpoints.ts</files>
<action>
创建 API 函数：
- `fetchStorylines(filters: StorylineFilters): Promise<Storyline[]>`
- `fetchAttackGraph(storylineId: string, timeRange?: TimeRange): Promise<{nodes: AttackNode[], edges: AttackEdge[]}>`
- `fetchTimeline(timeRange: TimeRange, sources?: string[]): Promise<TimelineEvent[]>`
- `fetchAssetContext(assetId: string): Promise<AssetContext>`
- `fetchHuntingResults(query: HuntingQuery): Promise<HuntingResult>`
</action>
<verify>
<automated>test -f frontend/src/api/analysisEndpoints.ts && grep -q "fetchStorylines" frontend/src/api/analysisEndpoints.ts && grep -q "fetchAttackGraph" frontend/src/api/analysisEndpoints.ts</automated>
</verify>
<done>API 端点文件存在且包含所有函数签名</done>
</task>

<task>
<name>Task W0-05: StorylineCard 组件骨架</name>
<files>frontend/src/components/analysis/StorylineCard.tsx</files>
<action>
创建组件骨架：
- `StorylineCardProps` 接口
- 组件接收 storyline, selected, onSelect props
- 基础结构：置信度标签 + 攻击阶段标签 + AI 摘要 + 关键指标占位
- 默认/selected/expanded 状态支持
- onClick 导航到 /graph/:storyId
</action>
<verify>
<automated>test -f frontend/src/components/analysis/StorylineCard.tsx && grep -q "StorylineCardProps" frontend/src/components/analysis/StorylineCard.tsx</automated>
</verify>
<done>组件文件存在，包含 StorylineCardProps 接口和默认导出</done>
</task>

<task>
<name>Task W0-06: StorylineList 组件骨架</name>
<files>frontend/src/components/analysis/StorylineList.tsx</files>
<action>
创建组件骨架：
- 左侧聚类面板 + 中央详情区布局
- 筛选状态管理（调用 analysisStore）
- 加载状态、错误状态、空状态占位
- 按置信度降序排序
</action>
<verify>
<automated>test -f frontend/src/components/analysis/StorylineList.tsx && grep -q "StorylineList" frontend/src/components/analysis/StorylineList.tsx</automated>
</verify>
<done>组件文件存在且包含默认导出</done>
</task>

<task>
<name>Task W0-07: AttackGraph 组件骨架</name>
<files>frontend/src/components/analysis/AttackGraph.tsx</files>
<action>
创建 React Flow 组件骨架：
- 导入 ReactFlow, Controls, MiniMap, Background
- nodeTypes 配置：host(圆形), user(方形), ip(菱形), process(六边形)
- edgeTypes 配置：confirmed(实线), suspected(虚线)
- dagre 布局配置占位（rankdir='LR'）
- 节点拖拽、缩放、选择支持
</action>
<verify>
<automated>test -f frontend/src/components/analysis/AttackGraph.tsx && grep -q "ReactFlow" frontend/src/components/analysis/AttackGraph.tsx && grep -q "dagre" frontend/src/components/analysis/AttackGraph.tsx</automated>
</verify>
<done>组件文件存在，包含 ReactFlow 和 dagre 集成</done>
</task>

<task>
<name>Task W0-08: Timeline 组件骨架</name>
<files>frontend/src/components/analysis/Timeline.tsx</files>
<action>
创建多轨道时间线组件骨架：
- 4 个轨道配置：network, endpoint, identity, application
- 事件卡片组件：时间戳, 数据源, 事件类型, 原始日志, 关联实体
- 展开/折叠单个轨道逻辑
- AI 异常点特殊颜色标记
- react-window 虚拟化占位
</action>
<verify>
<automated>test -f frontend/src/components/analysis/Timeline.tsx && grep -q "network" frontend/src/components/analysis/Timeline.tsx && grep -q "endpoint" frontend/src/components/analysis/Timeline.tsx</automated>
</verify>
<done>组件文件存在，包含 4 个轨道配置</done>
</task>

<task>
<name>Task W0-09: NavSidebar 组件骨架</name>
<files>frontend/src/components/analysis/NavSidebar.tsx</files>
<action>
创建导航组件骨架：
- 4 个导航项：告警中心(/alerts), 威胁狩猎(/hunting), 溯源时间线(/timeline), 资产图谱(/assets)
- 折叠状态：200px 展开 / 64px 图标模式
- 当前选中项 #06b6d4 左边框指示器
- React Router NavLink 集成
</action>
<verify>
<automated>test -f frontend/src/components/analysis/NavSidebar.tsx && grep -q "NavLink" frontend/src/components/analysis/NavSidebar.tsx</automated>
</verify>
<done>组件文件存在，包含 NavLink 导航</done>
</task>

<task>
<name>Task W0-10: AIPanel 组件骨架</name>
<files>frontend/src/components/analysis/AIPanel.tsx</files>
<action>
创建 AI Copilot 面板骨架：
- 自然语言查询输入框
- 智能推荐区域：关联推荐, 深度分析建议, 情报增强
- 订阅 analysisStore 上下文变化
- 状态显示：idle, querying, responding, error
- 证据整理与报告导出占位（PDF, Markdown, JSON）
</action>
<verify>
<automated>test -f frontend/src/components/analysis/AIPanel.tsx && grep -q "analysisStore" frontend/src/components/analysis/AIPanel.tsx</automated>
</verify>
<done>组件文件存在，订阅 analysisStore</done>
</task>

<task>
<name>Task W0-11: ContextPanel 组件骨架</name>
<files>frontend/src/components/analysis/ContextPanel.tsx</files>
<action>
创建资产上下文面板骨架：
- 3 个标签页：asset (基础信息/安全状态/关联图谱), threat_intel (IOC匹配/来源/关联攻击活动), behavior (基线偏离/同类资产对比)
- 根据选中实体动态加载数据
- 360度信息穿透结构
</action>
<verify>
<automated>test -f frontend/src/components/analysis/ContextPanel.tsx && grep -q "asset" frontend/src/components/analysis/ContextPanel.tsx && grep -q "threat_intel" frontend/src/components/analysis/ContextPanel.tsx</automated>
</verify>
<done>组件文件存在，包含 3 个标签页结构</done>
</task>

<task>
<name>Task W0-12: HuntingWorkbench 组件骨架</name>
<files>frontend/src/components/analysis/HuntingWorkbench.tsx</files>
<action>
创建威胁狩猎工作台骨架：
- 左侧 QueryBuilder 查询构建器区域
- 右侧查询结果区域（表格视图 + 可视化视图占位）
- 保存为检测规则 / 定期巡检任务功能占位
- 历史查询记录展示
</action>
<verify>
<automated>test -f frontend/src/components/analysis/HuntingWorkbench.tsx</automated>
</verify>
<done>组件文件存在</done>
</task>

<task>
<name>Task W0-13: 测试目录创建</name>
<files>frontend/tests/analysis/</files>
<action>
创建测试目录：
- `frontend/tests/analysis/.gitkeep`
- `frontend/tests/analysis/setup.ts` (Vitest 配置占位)
</action>
<verify>
<automated>test -d frontend/tests/analysis && test -f frontend/tests/analysis/setup.ts</automated>
</verify>
<done>测试目录和基础文件存在</done>
</task>

---

## Wave 1 — 页面路由与布局 (2026-03-26)

<task>
<name>Task 1-01: 路由配置</name>
<files>frontend/src/App.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/App.tsx
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-CONTEXT.md
</read_first>
<action>
新增导入：
```typescript
import { AlertCenterPage } from './pages/AlertCenterPage';
import { AttackGraphPage } from './pages/AttackGraphPage';
import { TimelinePage } from './pages/TimelinePage';
import { HuntingPage } from './pages/HuntingPage';
import { AssetContextPage } from './pages/AssetContextPage';
```

新增路由配置：
```typescript
{ path: 'alerts', element: <AlertCenterPage /> },
{ path: 'graph/:storyId', element: <AttackGraphPage /> },
{ path: 'timeline', element: <TimelinePage /> },
{ path: 'hunting', element: <HuntingPage /> },
{ path: 'assets/:assetId', element: <AssetContextPage /> },
```
</action>
<verify>
<automated>grep -q "AlertCenterPage" frontend/src/App.tsx && grep -q "AttackGraphPage" frontend/src/App.tsx</automated>
</verify>
<done>App.tsx 包含 5 个新路由：/alerts, /graph/:storyId, /timeline, /hunting, /assets/:assetId</done>
</task>

<task>
<name>Task 1-02: Analysis Shell 布局组件</name>
<files>frontend/src/components/analysis/AnalysisShell.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/components/layout/AppShell.tsx
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-UI-SPEC.md
</read_first>
<action>
```typescript
// AnalysisShell 组件结构
<div className="flex h-screen bg-[#0f172a]">
  {/* 左侧导航 200px, 折叠时 64px */}
  <NavSidebar collapsed={isCollapsed} onToggle={toggleNav} />
  {/* 中央画布 flex-1 */}
  <main className="flex-1 overflow-auto">
    {children}
  </main>
  {/* 右侧 AI Copilot 320px */}
  <AIPanel />
</div>
```
</action>
<verify>
<automated>test -f frontend/src/components/analysis/AnalysisShell.tsx && grep -q "NavSidebar" frontend/src/components/analysis/AnalysisShell.tsx && grep -q "AIPanel" frontend/src/components/analysis/AnalysisShell.tsx</automated>
</verify>
<done>三栏布局: 左侧NavSidebar (200px), 中央Canvas (flex-1), 右侧AIPanel (320px)</done>
</task>

<task>
<name>Task 1-03: 导航组件 NavSidebar</name>
<files>frontend/src/components/analysis/NavSidebar.tsx</files>
<read_first>
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-UI-SPEC.md
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-CONTEXT.md
</read_first>
<action>
导航项配置：
```typescript
const navItems = [
  { path: '/alerts', icon: AlertCircle, label: '告警中心' },
  { path: '/hunting', icon: Search, label: '威胁狩猎' },
  { path: '/timeline', icon: Clock, label: '溯源时间线' },
  { path: '/assets', icon: Server, label: '资产图谱' },
];
```
</action>
<verify>
<automated>grep -q "navItems" frontend/src/components/analysis/NavSidebar.tsx && grep -q "/alerts" frontend/src/components/analysis/NavSidebar.tsx</automated>
</verify>
<done>4 个导航项: 告警中心, 威胁狩猎, 溯源时间线, 资产图谱；当前选中项有 #06b6d4 左边框指示器</done>
</task>

---

## Wave 2 — 智能告警中心 (2026-03-26)

<task>
<name>Task 2-01: 故事线卡片 StorylineCard</name>
<files>frontend/src/components/analysis/StorylineCard.tsx</files>
<read_first>
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-FEATURE.md
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-UI-SPEC.md
- /home/admin/work/SecAlert/frontend/src/components/ui/Badge.tsx
</read_first>
<action>
StorylineCard 接口：
```typescript
interface StorylineCardProps {
  storyline: Storyline;
  selected?: boolean;
  onSelect?: (storyId: string) => void;
}

// 置信度颜色
const confidenceColors = {
  high: 'text-red-500',      // >80
  medium: 'text-orange-500', // 50-80
  low: 'text-gray-400',       // <50
};
```
</action>
<verify>
<automated>grep -q "confidenceColors" frontend/src/components/analysis/StorylineCard.tsx && grep -q "StorylineCardProps" frontend/src/components/analysis/StorylineCard.tsx</automated>
</verify>
<done>显示置信度评分 (红>80, 橙50-80, 灰<50)、攻击阶段标签、AI摘要、关键指标；点击导航到 /graph/:storyId</done>
</task>

<task>
<name>Task 2-02: 故事线列表 StorylineList</name>
<files>frontend/src/components/analysis/StorylineList.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/components/AlertList.tsx
- /home/admin/work/SecAlert/frontend/src/stores/analysisStore.ts
</read_first>
<action>
完善 W0-06 骨架：
- 筛选功能：时间范围, 严重级别, 资产类型, ATT&CK战术, 置信度评分, 数据源 (D-08)
- 按置信度降序排序 (Research建议)
- 左侧聚类面板 + 中央详情区布局
- 空状态显示 "暂无告警" + 友好提示
- 加载状态和错误状态处理
</action>
<verify>
<automated>grep -q "StorylineFilters" frontend/src/components/analysis/StorylineList.tsx && grep -q "confidence" frontend/src/components/analysis/StorylineList.tsx</automated>
</verify>
<done>支持全部筛选维度 (D-08)，按置信度降序排序，左侧聚类面板 + 中央详情区布局</done>
</task>

<task>
<name>Task 2-03: 告警中心页面 AlertCenterPage</name>
<files>frontend/src/pages/AlertCenterPage.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/pages/AlertListPage.tsx
</read_first>
<action>
页面结构：
- 路由: /alerts
- 顶部筛选栏（时间范围, 严重级别, 资产类型, ATT&CK战术, 置信度, 数据源）
- 左侧 StorylineList 聚类面板
- 右侧上下文面板（关联资产信息, 历史告警, 威胁情报）
- 使用 analysisStore 管理选中状态
</action>
<verify>
<automated>test -f frontend/src/pages/AlertCenterPage.tsx && grep -q "StorylineList" frontend/src/pages/AlertCenterPage.tsx</automated>
</verify>
<done>路由 /alerts，顶部筛选栏，左侧 StorylineList，右侧上下文面板</done>
</task>

---

## Wave 3 — 攻击链路分析画布 (2026-03-26)

<task>
<name>Task 3-01: 攻击图 AttackGraph (React Flow)</name>
<files>frontend/src/components/analysis/AttackGraph.tsx</files>
<read_first>
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-RESEARCH.md
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-FEATURE.md
</read_first>
<action>
完善 W0-07 骨架：
```typescript
// 节点形状映射
const nodeTypes = {
  host: { shape: 'circle', color: '#06b6d4' },
  user: { shape: 'rect', color: '#8b5cf6' },
  ip: { shape: 'diamond', color: '#f59e0b' },
  process: { shape: 'hexagon', color: '#ef4444' },
};

// dagre 布局配置
dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });
```
</action>
<verify>
<automated>grep -q "host.*circle" frontend/src/components/analysis/AttackGraph.tsx && grep -q "rankdir.*LR" frontend/src/components/analysis/AttackGraph.tsx</automated>
</verify>
<done>React Flow 渲染，dagre 布局 (rankdir='LR')，节点拖拽/缩放，MiniMap 和 Controls</done>
</task>

<task>
<name>Task 3-02: 攻击图页面 AttackGraphPage</name>
<files>frontend/src/pages/AttackGraphPage.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/pages/AlertDetailPage.tsx
</read_first>
<action>
页面结构：
- 路由: /graph/:storyId
- 从 URL params 获取 storylineId
- 顶部显示故事线摘要（置信度, 攻击阶段, 涉及资产数）
- 中央 AttackGraph 画布
- 底部范围滑块时间轴控制器 (D-06)
- 右侧 ContextPanel 显示选中实体详情
</action>
<verify>
<automated>test -f frontend/src/pages/AttackGraphPage.tsx && grep -q "AttackGraph" frontend/src/pages/AttackGraphPage.tsx && grep -q "ContextPanel" frontend/src/pages/AttackGraphPage.tsx</automated>
</verify>
<done>路由 /graph/:storyId，攻击图画布，底部范围滑块时间轴控制器 (D-06)</done>
</task>

---

## Wave 4 — 溯源时间线 (2026-03-26)

<task>
<name>Task 4-01: 时间线组件 Timeline</name>
<files>frontend/src/components/analysis/Timeline.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/components/ChainTimeline.tsx
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-FEATURE.md
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-RESEARCH.md
</read_first>
<action>
完善 W0-08 骨架：
- 4 个轨道: network, endpoint, identity, application
- 每个轨道显示时间范围内的事件
- 事件卡片: 时间戳, 数据源, 事件类型, 原始日志, 关联实体
- 默认全部折叠 (Research建议)
- 支持展开/折叠单个轨道
- AI 异常点自动标注（特殊颜色标记）
- 支持虚拟化列表 (react-window)
</action>
<verify>
<automated>grep -q "network" frontend/src/components/analysis/Timeline.tsx && grep -q "endpoint" frontend/src/components/analysis/Timeline.tsx && grep -q "identity" frontend/src/components/analysis/Timeline.tsx</automated>
</verify>
<done>4 个轨道显示，展开/折叠，异常标注，虚拟化列表</done>
</task>

<task>
<name>Task 4-02: 时间线页面 TimelinePage</name>
<files>frontend/src/pages/TimelinePage.tsx</files>
<action>
页面结构：
- 路由: /timeline
- 顶部筛选栏（时间范围, 数据源, 事件类型）
- 多轨道 Timeline 组件
- 底部范围滑块时间轴控制器 (D-06)
- 支持拖拽时间轴回放攻击演进 (D-06)
</action>
<verify>
<automated>test -f frontend/src/pages/TimelinePage.tsx && grep -q "Timeline" frontend/src/pages/TimelinePage.tsx</automated>
</verify>
<done>路由 /timeline，多轨道 Timeline，底部范围滑块时间轴控制器 (D-06)</done>
</task>

---

## Wave 5 — 威胁狩猎工作台 (2026-03-26)

<task>
<name>Task 5-01: 查询构建器 QueryBuilder</name>
<files>frontend/src/components/analysis/QueryBuilder.tsx</files>
<read_first>
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-RESEARCH.md
</read_first>
<action>
可视化查询构建器：
- 字段 + 操作符 + 值 三元组
- 支持添加多个条件 (AND/OR)
- 字段下拉: src_ip, dst_ip, user, hostname, alert_signature, mitre_tactic 等
- 操作符下拉: =, !=, contains, starts_with, ends_with
- 值输入框
- 支持保存为检测规则
- 支持保存为定期巡检任务
</action>
<verify>
<automated>test -f frontend/src/components/analysis/QueryBuilder.tsx && grep -q "src_ip" frontend/src/components/analysis/QueryBuilder.tsx && grep -q "AND" frontend/src/components/analysis/QueryBuilder.tsx</automated>
</verify>
<done>三元组查询构建器，支持 AND/OR 条件，支持保存为检测规则/巡检任务</done>
</task>

<task>
<name>Task 5-02: 狩猎工作台页面 HuntingPage</name>
<files>frontend/src/pages/HuntingPage.tsx</files>
<action>
页面结构：
- 路由: /hunting
- 左侧 QueryBuilder 查询构建器
- 右侧查询结果: 表格视图 + 可视化视图 (recharts)
- 支持导出为检测规则或巡检任务
- 展示历史查询记录
</action>
<verify>
<automated>test -f frontend/src/pages/HuntingPage.tsx && grep -q "QueryBuilder" frontend/src/pages/HuntingPage.tsx</automated>
</verify>
<done>路由 /hunting，QueryBuilder，结果表格+可视化，历史记录</done>
</task>

---

## Wave 6 — 资产上下文面板 (2026-03-26)

<task>
<name>Task 6-01: 上下文面板 ContextPanel</name>
<files>frontend/src/components/analysis/ContextPanel.tsx</files>
<read_first>
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-FEATURE.md
</read_first>
<action>
完善 W0-11 骨架：
- 3 个标签页: asset (基础信息, 安全状态, 关联图谱), threat_intel (IOC匹配, 来源, 关联攻击活动), behavior (基线偏离, 同类资产对比)
- 根据选中实体动态加载数据
- 360度信息穿透
</action>
<verify>
<automated>grep -q "tab.*asset" frontend/src/components/analysis/ContextPanel.tsx && grep -q "360" frontend/src/components/analysis/ContextPanel.tsx</automated>
</verify>
<done>3 个标签页，360度信息穿透，动态数据加载</done>
</task>

<task>
<name>Task 6-02: 资产页面 AssetContextPage</name>
<files>frontend/src/pages/AssetContextPage.tsx</files>
<action>
页面结构：
- 路由: /assets/:assetId
- 从 URL params 获取 assetId
- ContextPanel 展示资产完整信息
- 支持关联实体图谱可视化
</action>
<verify>
<automated>test -f frontend/src/pages/AssetContextPage.tsx && grep -q "ContextPanel" frontend/src/pages/AssetContextPage.tsx</automated>
</verify>
<done>路由 /assets/:assetId，ContextPanel 展示资产信息</done>
</task>

---

## Wave 7 — AI 调查助手 (2026-03-26)

<task>
<name>Task 7-01: AI Copilot 面板 AIPanel</name>
<files>frontend/src/components/analysis/AIPanel.tsx</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/stores/chatStore.ts
- /home/admin/work/SecAlert/.planning/phases/09-analysis-workbench/09-CONTEXT.md
</read_first>
<action>
完善 W0-10 骨架：
- 自然语言查询输入
- 智能推荐: 关联推荐, 深度分析建议, 情报增强
- 订阅 analysisStore 上下文变化（选中告警/故事线/实体）
- 状态: idle, querying, responding, error
- 证据整理与报告导出（PDF, Markdown, JSON）(D-10)
- 上下文感知: 根据当前分析上下文自动调整建议
</action>
<verify>
<automated>grep -q "copilotContext" frontend/src/components/analysis/AIPanel.tsx && grep -q "suggestedQueries" frontend/src/components/analysis/AIPanel.tsx</automated>
</verify>
<done>自然语言查询，智能推荐，上下文感知，多格式导出 (D-10)</done>
</task>

---

## Wave 8 — 状态管理与 API 集成 (2026-03-26)

<task>
<name>Task 8-01: Zustand Analysis Store</name>
<files>frontend/src/stores/analysisStore.ts</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/stores/chatStore.ts
</read_first>
<action>
完善 W0-03 骨架：
- 状态: currentView, selectedStorylineId, selectedEntityId, selectedEntityType, timeRange, filters
- AI Copilot 状态: copilotOpen, copilotContext
- persist middleware 配置, 只持久化 currentView, timeRange, selectedStorylineId
- Actions: setCurrentView, selectStoryline, selectEntity, setTimeRange, updateFilters
</action>
<verify>
<automated>grep -q "persist" frontend/src/stores/analysisStore.ts && grep -q "setCurrentView" frontend/src/stores/analysisStore.ts</automated>
</verify>
<done>Zustand store，persist middleware，完整 Actions</done>
</task>

<task>
<name>Task 8-02: 分析 API 端点</name>
<files>frontend/src/api/analysisEndpoints.ts</files>
<action>
实现以下 API 函数（使用 mock 数据，因为 Phase 10 才进行后端联调）：
- `fetchStorylines(filters: StorylineFilters): Promise<Storyline[]>` — 返回空数组或 mock 故事线数据
- `fetchAttackGraph(storylineId: string, timeRange?: TimeRange): Promise<{nodes: AttackNode[], edges: AttackEdge[]}>` — 返回空图或 mock 节点/边数据
- `fetchTimeline(timeRange: TimeRange, sources?: string[]): Promise<TimelineEvent[]>` — 返回空数组或 mock 时间线事件
- `fetchAssetContext(assetId: string): Promise<AssetContext>` — 返回 mock 资产上下文数据
- `fetchHuntingResults(query: HuntingQuery): Promise<HuntingResult>` — 返回 mock 狩猎结果

API 客户端使用 `frontend/src/lib/api.ts` 中的基础客户端模式，确保函数签名与类型定义一致。
</action>
<verify>
<automated>grep -q "fetchStorylines" frontend/src/api/analysisEndpoints.ts && grep -q "fetchAttackGraph" frontend/src/api/analysisEndpoints.ts && grep -q "fetchTimeline" frontend/src/api/analysisEndpoints.ts</automated>
</verify>
<done>所有 API 函数实现（使用 mock 数据），与后端联调在 Phase 10 完成</done>
</task>

---

## Wave 9 — 类型定义 (2026-03-26)

<task>
<name>Task 9-01: 分析模块类型定义</name>
<files>frontend/src/types/analysis.ts</files>
<read_first>
- /home/admin/work/SecAlert/frontend/src/types/index.ts
</read_first>
<action>
完善 W0-02 骨架：
```typescript
// 故事线
interface Storyline {
  id: string;
  confidence: number; // 0-100
  attackPhase: string;
  summary: string;
  assetCount: number;
  firstActivity: string;
  lastActivity: string;
  threatIntelMatch: number; // 0-100
  alerts: Alert[];
}

// 攻击节点
interface AttackNode {
  id: string;
  type: 'host' | 'user' | 'ip' | 'process';
  label: string;
  severity?: Severity;
  data: Record<string, unknown>;
}

// 攻击边
interface AttackEdge {
  id: string;
  source: string;
  target: string;
  type: 'confirmed' | 'suspected';
  animated?: boolean;
}

// 时间线事件
interface TimelineEvent {
  id: string;
  timestamp: string;
  layer: 'network' | 'endpoint' | 'identity' | 'application';
  source: string;
  eventType: string;
  rawLog?: string;
  entities: string[];
  isAnomaly?: boolean;
}

// 故事线筛选
interface StorylineFilters {
  timeRange?: { start: string; end: string };
  severities?: Severity[];
  assetTypes?: string[];
  mitreTactics?: string[];
  confidenceRange?: { min: number; max: number };
  sources?: string[];
}
```
</action>
<verify>
<automated>grep -q "interface Storyline" frontend/src/types/analysis.ts && grep -q "interface AttackNode" frontend/src/types/analysis.ts && grep -q "interface TimelineEvent" frontend/src/types/analysis.ts</automated>
</verify>
<done>所有类型定义完整，包含 Storyline, AttackNode, AttackEdge, TimelineEvent, StorylineFilters</done>
</task>

---

## 验收标准

### 功能验收

| 功能 | 验收条件 |
|------|----------|
| 路由配置 | 5 个新路由正确注册, 支持 deep link |
| 故事线卡片 | 显示置信度, 攻击阶段, AI摘要, 关键指标 |
| 攻击链路图 | React Flow 渲染, dagre 布局, 节点拖拽/缩放 |
| 时间线 | 4 轨道显示, 展开/折叠, 异常标注 |
| 威胁狩猎 | 查询构建器三元组, 结果表格+可视化 |
| 资产上下文 | 3 标签页, 360度信息穿透 |
| AI Copilot | 上下文感知, 智能推荐, 多格式导出 |
| 侧边栏 | 200px/64px 折叠, 响应式 |

### 技术验收

| 条件 | 验收命令 |
|------|----------|
| 依赖安装 | `npm list @xyflow/react dagre` 显示已安装 |
| TypeScript 编译 | `npm run build` 无错误 |
| Vitest 测试 | `npm run test -- --run` 全部通过 |
| 路由注册 | `grep -r "path:" frontend/src/App.tsx` 显示 5 个分析路由 |

### 视觉验收 (手动)

| 检查点 | 条件 |
|--------|------|
| 深色主题 | #0f172a 背景, #1e293b 卡片 |
| 强调色 | #06b6d4 用于选中项, 按钮, focus ring |
| 侧边栏折叠 | 宽度 <1200px 时自动折叠到 64px |
| 攻击图交互 | 节点拖拽, 缩放, 路径高亮正常 |
| 范围滑块时间轴控制器 | 拖拽更新视图时间范围 (D-06) |

---

## 文件修改清单

### 新增文件

```
frontend/src/
├── components/analysis/
│   ├── AnalysisShell.tsx      # 三栏布局容器
│   ├── NavSidebar.tsx         # 左侧导航
│   ├── AIPanel.tsx            # AI Copilot 面板
│   ├── StorylineCard.tsx      # 故事线卡片
│   ├── StorylineList.tsx      # 故事线列表
│   ├── AttackGraph.tsx        # React Flow 攻击图
│   ├── Timeline.tsx            # 多轨道时间线
│   ├── ContextPanel.tsx        # 资产上下文面板
│   ├── QueryBuilder.tsx       # 可视化查询构建器
│   └── HuntingWorkbench.tsx    # 威胁狩猎工作台
├── pages/
│   ├── AlertCenterPage.tsx    # /alerts
│   ├── AttackGraphPage.tsx    # /graph/:storyId
│   ├── TimelinePage.tsx       # /timeline
│   ├── HuntingPage.tsx        # /hunting
│   └── AssetContextPage.tsx   # /assets/:assetId
├── stores/
│   └── analysisStore.ts       # 全局分析上下文
├── api/
│   └── analysisEndpoints.ts   # 分析 API 客户端
└── types/
    └── analysis.ts            # 分析模块类型定义
```

### 修改文件

```
frontend/src/App.tsx                    # 新增 5 个路由
frontend/package.json                   # 新增 @xyflow/react, dagre, @types/dagre
frontend/tsconfig.json                  # 可能需要配置路径别名
```

---

## must_haves (目标逆向验证)

**核心价值:** 帮助非专业运维人员自动过滤海量告警, 只报警真实攻击

| ID | must_have | 验证方式 |
|----|-----------|----------|
| M-01 | 故事线按置信度排序, 高置信度优先 | UI 验证或 API 响应排序 |
| M-02 | 攻击链路可视化, 一眼看懂攻击路径 | React Flow 渲染节点/边 |
| M-03 | AI 建议附带"为什么"解释 | AIPanel 输出包含 reasoning |
| M-04 | 所有分析操作可追溯 | 调查历史记录功能 |
| M-05 | 非专业用户可独立完成分析 | 简化的三元组查询构建器 |

---

*计划版本: 1.2*
*创建时间: 2026-03-26*
*修订时间: 2026-03-26 (修复格式: 添加 YAML frontmatter, 将任务转换为 XML 格式, 为 Task 8-02 添加 action 元素)*
*规划者: gsd-planner*
