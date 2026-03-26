# Phase 9: 智能分析工作台 - Research

**Researched:** 2026-03-26
**Domain:** 前端 React 应用 - 交互式威胁分析平台
**Confidence:** MEDIUM-HIGH

## Summary

Phase 9 需要构建一个专业级威胁分析工作台，集成交互式攻击链路图、多轨道时间线、AI 辅助调查助手。项目已具备扎实的前端基础：React 18、React Router 6、Zustand 4.5、TanStack Query 5。

**关键技术选型已锁定：**
- React Flow v12 (`@xyflow/react`) 用于攻击链路可视化
- Zustand + persist middleware 管理全局分析上下文
- Neo4j 图数据由后端聚合，前端只负责渲染

**主要研究贡献：**
- 验证 React Flow v12 包名变更和 API 变化
- 确定 dagre 0.8.5 作为布局算法
- 明确后端 API 端点设计方向（聚合图数据返回）
- 识别待决策项：故事线排序规则、布局算法细节

**Primary recommendation:** 使用 `@xyflow/react@12` + `dagre` 布局，先实现攻击链路图核心渲染，再逐步完善交互。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

| ID | Decision | Implication |
|----|----------|-------------|
| D-01 | 路由驱动布局 — 每个视图对应独立路由 | 需要在 App.tsx 添加 5 个新路由 |
| D-02 | 混合导航折叠 — 默认手动，<1200px 自动 | 响应式侧边栏组件 |
| D-03 | 路由跳转详情 — 不使用 Modal/Slide-over | 完整页面导航 |
| D-04 | React Flow — 渲染攻击链路图 | 核心可视化组件 |
| D-05 | 后端 API 聚合图数据 | Neo4j 查询 + 聚合端点 |
| D-06 | 范围滑块时间轴 | 底部时间范围选择器 |
| D-07 | 后端聚类计算 | 前端只渲染聚类结果 |
| D-08 | 全部筛选维度支持 | 复杂筛选栏 UI |
| D-09 | Zustand 状态管理 | 全局分析上下文 store |
| D-10 | 多格式导出 | PDF + Markdown + JSON |

### Claude's Discretion

| Item | Recommendation | Rationale |
|------|----------------|------------|
| 故事线默认排序 | 按置信度降序 | 高置信度优先，符合"只报警真实攻击"核心价值 |
| 布局算法 | dagre (从左到右) | 攻击链路本质是有向无环图，dagre 最适合 |
| 查询构建器语法 | 简化为"字段+操作符+值"三元组 | 非专业用户友好，避免复杂 SQL |
| 时间线轨道状态 | 默认全部折叠 | 减少视觉干扰，用户按需展开 |

### Deferred Ideas

**None** — 所有讨论保持在 phase scope 内。

---

## Standard Stack

### Core (Frontend)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| react | 18.2.0 | UI 框架 | 已安装 |
| react-router-dom | 6.30.3 | 路由管理 | 已安装 |
| zustand | 4.5.7 | 状态管理 | 已安装 |
| @tanstack/react-query | 5.95.2 | 服务端状态 | 已安装 |
| date-fns | 3.6.0 | 时间处理 | 已安装 |
| @xyflow/react | 12.10.1 | React Flow v12 | **需安装** |
| dagre | 0.8.5 | 图布局算法 | **需安装** |
| @types/dagre | 0.8.5 | dagre 类型 | **需安装** |

**Installation:**
```bash
cd frontend && npm install @xyflow/react dagre @types/dagre
```

### Supporting (Frontend)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| lucide-react | 图标库 | 已有，大量使用 |
| recharts | 图表 | 威胁狩猎可视化 |
| jspdf | PDF 导出 | 报告导出 |
| xlsx | Excel 导出 | 数据导出 |
| class-variance-authority | 组件变体 | 已有，StorylineCard 等 |

### Backend

| Library | Version | Purpose |
|---------|---------|---------|
| neo4j-driver | 6.0.1 | Neo4j 图数据库连接 |
| fastapi | 0.104.0+ | REST API 框架 |
| pydantic | 2.0.0+ | 数据验证 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xyflow/react | react-flow (v11) | v12 包名变更，API 略有变化 |
| dagre | elk.js / force-graph | dagre 更适合有向无环图，elk 更适合层次数据 |
| Zustand | Jotai / Redux Toolkit | Zustand 已安装，更轻量 |

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # 三栏布局容器
│   │   ├── LeftNav.tsx           # 左侧导航
│   │   └── AIPanel.tsx          # 右侧 AI Copilot
│   ├── analysis/
│   │   ├── StorylineCard.tsx     # 故事线卡片
│   │   ├── StorylineList.tsx    # 故事线列表
│   │   ├── AttackGraph.tsx       # React Flow 攻击图
│   │   ├── Timeline.tsx          # 多轨道时间线
│   │   ├── TimelineTrack.tsx     # 单条轨道
│   │   ├── QueryBuilder.tsx      # 可视化查询构建器
│   │   └── ContextPanel.tsx      # 资产上下文面板
│   └── ui/                       # shadcn 组件
├── pages/
│   ├── AlertCenterPage.tsx       # /alerts
│   ├── AttackGraphPage.tsx       # /graph/:storyId
│   ├── TimelinePage.tsx          # /timeline
│   ├── HuntingPage.tsx           # /hunting
│   └── AssetContextPage.tsx      # /assets/:assetId
├── stores/
│   └── analysisStore.ts          # 全局分析上下文 (Zustand)
├── hooks/
│   ├── useStorylines.ts          # 故事线数据 hook
│   ├── useAttackGraph.ts         # 攻击图数据 hook
│   ├── useTimeline.ts            # 时间线数据 hook
│   └── useAIRecommendations.ts   # AI 推荐 hook
├── api/
│   └── analysisEndpoints.ts      # 分析模块 API
└── types/
    └── analysis.ts               # 分析模块类型定义
```

### Pattern 1: React Flow Attack Graph

**What:** 使用 `@xyflow/react` 渲染交互式攻击链路图

**When to use:** 需要可视化实体关系和攻击路径时

**Node Types:**
```typescript
// 节点类型定义
interface AttackNode {
  id: string;
  type: 'host' | 'user' | 'ip' | 'process';
  position: { x: number; y: number };
  data: {
    label: string;
    entityType: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
  };
}

// 边类型定义
interface AttackEdge {
  id: string;
  source: string;
  target: string;
  type: 'confirmed' | 'suspected'; // 实线=已确认，虚线=推测
  animated?: boolean;
}
```

**Dagre Layout Integration:**
```typescript
import dagre from 'dagre';

function getLayoutedElements(nodes: AttackNode[], edges: AttackEdge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 150, height: 50 });
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    return { ...node, position: { x, y } };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Pattern 2: Zustand Analysis Context

**What:** 全局状态管理，用于 AI Copilot 订阅上下文变化

**When to use:** AI 建议需要根据当前选中的告警/故事线自动调整时

```typescript
interface AnalysisContext {
  // 当前分析上下文
  currentView: 'alerts' | 'graph' | 'timeline' | 'hunting' | 'assets';
  selectedStorylineId: string | null;
  selectedEntityId: string | null;
  selectedEntityType: 'host' | 'user' | 'ip' | 'process' | null;
  timeRange: { start: Date; end: Date };
  filters: StorylineFilters;

  // AI Copilot 状态
  copilotOpen: boolean;
  copilotContext: {
    relatedAlerts: string[];
    suggestedQueries: string[];
  };
}

export const useAnalysisStore = create<AnalysisContext>()(
  persist(
    (set) => ({
      currentView: 'alerts',
      selectedStorylineId: null,
      selectedEntityId: null,
      selectedEntityType: null,
      timeRange: { start: subDays(new Date(), 7), end: new Date() },
      filters: { severities: [], assetTypes: [], mitreTactics: [] },
      copilotOpen: false,
      copilotContext: { relatedAlerts: [], suggestedQueries: [] },
    }),
    { name: 'secalert-analysis' }
  )
);
```

### Pattern 3: Backend API Aggregation

**What:** 后端查询 Neo4j 并聚合图数据返回给前端

**When to use:** 图数据量大，需要后端计算聚合时

**API Endpoint Pattern:**
```python
# GET /api/analysis/graph/{storyline_id}
# Query params: time_range_start, time_range_end, layout_hint
{
  "storyline_id": "xxx",
  "nodes": [
    {"id": "n1", "type": "host", "label": "Web Server", "severity": "high"},
    {"id": "n2", "type": "ip", "label": "192.168.1.100", "severity": null}
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2", "type": "confirmed"}
  ],
  "summary": {
    "total_alerts": 23,
    "attack_phase": "Lateral Movement",
    "confidence": 85
  }
}
```

### Anti-Patterns to Avoid

- **不要在前端做复杂聚类计算：** D-07 明确后端聚类，前端只渲染
- **不要用 Modal/Slide-over 做详情页：** D-03 要求路由跳转
- **不要用 Redux：** Zustand 已安装且更轻量
- **不要手写图布局算法：** 使用 dagre，避免自己实现 force-directed

---

## Common Pitfalls

### Pitfall 1: React Flow 节点拖拽与布局冲突

**What goes wrong:** 用户手动拖拽节点后，下次数据更新时位置被布局算法覆盖

**Why it happens:** dagre 布局每次都会重新计算所有节点位置

**How to avoid:** 保存用户手动布局的节点位置，在 dagre 计算后应用偏移量

**Warning signs:** 节点位置每次刷新都重置

### Pitfall 2: 大规模图数据性能

**What goes wrong:** 数千个节点的图卡顿

**Why it happens:** React Flow 默认渲染所有节点

**How to avoid:** 使用 `nodeExtent` 限制视图范围 + 懒加载 + 聚合

**Warning signs:** 页面响应慢，Chrome DevTools 显示大量重绘

### Pitfall 3: Zustand 状态与 URL 不同步

**What goes wrong:** 用户刷新页面，分析上下文丢失

**Why it happens:** Zustand persist 默认只持久化到 localStorage

**How to avoid:** 使用 URL params 作为真相来源，Zustand 只做运行时状态

**Warning signs:** 刷新后页面状态不正确

### Pitfall 4: 时间线多轨道渲染性能

**What goes wrong:** 数千个事件分散在 4 个轨道上，滚动卡顿

**Why it happens:** 没有虚拟化列表

**How to avoid:** 使用 react-window 或类似库进行虚拟化

**Warning signs:** 时间线滚动掉帧

### Pitfall 5: AI Copilot 上下文膨胀

**What goes wrong:** AI Copilot 请求的上下文过大，导致 Token 溢出或响应慢

**Why it happens:** 没有限制上下文大小

**How to avoid:** 限制相关告警数量（如最近 20 条），只发送摘要而非全文

**Warning signs:** API 请求超时或 AI 响应不完整

---

## Code Examples

### React Flow 基本集成

```typescript
// Source: @xyflow/react v12 官方文档模式
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function AttackGraphCanvas({ nodes, edges, onNodeClick }: Props) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      fitView
      attributionPosition="bottom-left"
    >
      <Background color="#06b6d4" gap={16} />
      <Controls />
      <MiniMap
        nodeColor={(node) => severityColors[node.data.severity || 'low']}
        maskColor="rgba(15, 23, 42, 0.8)"
      />
    </ReactFlow>
  );
}
```

### Zustand 持久化配置

```typescript
// Source: zustand v4 persist middleware 官方模式
export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // ... initial state
    }),
    {
      name: 'secalert-analysis',
      partialize: (state) => ({
        // 只持久化这些字段
        currentView: state.currentView,
        timeRange: state.timeRange,
        selectedStorylineId: state.selectedStorylineId,
      }),
    }
  )
);
```

### TanStack Query 数据获取

```typescript
// Source: @tanstack/react-query v5 官方模式
import { useQuery } from '@tanstack/react-query';

function useStorylines(filters: StorylineFilters) {
  return useQuery({
    queryKey: ['storylines', filters],
    queryFn: () => fetchStorylines(filters),
    staleTime: 30000, // 30 秒
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-flow (v11) | @xyflow/react (v12) | 2024 包名变更 | 需要更新 import |
| Redux | Zustand | Phase 7 | 更简洁的 API |
| 前端聚类 | 后端聚类 | D-07 | 性能提升 |

**Deprecated/outdated:**
- `react-flow` 包名 - 已迁移到 `@xyflow/react`
- 类组件模式 - 项目使用函数组件

---

## Open Questions

1. **故事线聚类算法细节**
   - What we know: 后端完成聚类，通过 API 返回
   - What's unclear: 聚类算法基于 ATT&CK 战术还是时间窗口？
   - Recommendation: 在后端 API 设计阶段明确聚类策略

2. **攻击链路图节点扩展性**
   - What we know: 支持 host/user/ip/process 四种节点
   - What's unclear: 未来是否需要支持更多类型（域名、证书等）？
   - Recommendation: 设计时可扩展，留意 Neo4j schema 扩展性

3. **AI Copilot 与现有 chatStore 的关系**
   - What we know: 已有 `chatStore` 管理 AI 对话
   - What's unclear: 是否复用还是新建专用 store？
   - Recommendation: 新建 `analysisStore`，AI Copilot 作为分析上下文消费者

4. **Neo4j Schema 是否需要扩展**
   - What we know: 当前 schema 有 Alert 和 AttackChain 节点
   - What's unclear: 攻击链路图需要的额外节点类型（主机、用户等）是否已建模？
   - Recommendation: 检查现有 `src/graph/client.py` 是否支持所需查询

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 前端构建 | ✓ | 18+ (项目要求) | — |
| npm | 包管理 | ✓ | 10+ | — |
| Python 3.10+ | 后端 API | ✓ (系统) | 3.10+ | — |
| Neo4j | 图数据存储 | ✓ (Docker) | 5.x | — |
| FastAPI | REST API | ✓ | 0.104.0+ | — |

**Missing dependencies with no fallback:**
- None — 所有依赖可用

**Missing dependencies with fallback:**
- None — 所有依赖可用

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (已配置在项目中) |
| Config file | `vite.config.ts` |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run --coverage` |

### Phase Requirements Map

> Phase 9 是 v1.2 新功能，无特定 REQ-* IDs。以下为功能性验证点。

| Feature | Behavior | Test Type | File Exists |
|---------|----------|-----------|-------------|
| 路由配置 | 5 个新路由正确注册 | unit | `frontend/src/App.tsx` |
| 故事线卡片 | 渲染置信度、攻击阶段标签 | unit | `StorylineCard.tsx` |
| 攻击图 | React Flow 正确渲染节点/边 | unit | `AttackGraph.tsx` |
| 时间线 | 多轨道正确渲染 | unit | `Timeline.tsx` |
| Zustand Store | 分析上下文状态正确管理 | unit | `analysisStore.ts` |
| API 集成 | 后端图数据正确获取 | integration | API endpoints |

### Wave 0 Gaps

- [ ] `frontend/src/stores/analysisStore.ts` — 全局分析上下文
- [ ] `frontend/src/components/analysis/StorylineCard.tsx` — 故事线卡片
- [ ] `frontend/src/components/analysis/StorylineList.tsx` — 故事线列表
- [ ] `frontend/src/components/analysis/AttackGraph.tsx` — React Flow 图
- [ ] `frontend/src/components/analysis/Timeline.tsx` — 多轨道时间线
- [ ] `frontend/src/pages/AlertCenterPage.tsx` — 告警中心页
- [ ] `frontend/src/api/analysisEndpoints.ts` — 分析 API 客户端
- [ ] `frontend/src/types/analysis.ts` — 分析模块类型定义

---

## Sources

### Primary (HIGH confidence)

- `@xyflow/react` npm registry — v12.10.1，2024 年包名从 `react-flow` 变更为 `@xyflow/react`
- Zustand 官方文档 — persist middleware API，v4.5.7
- TanStack Query 官方文档 — v5 数据获取模式
- 项目现有代码 — `frontend/src/stores/chatStore.ts`, `frontend/src/api/client.ts`

### Secondary (MEDIUM confidence)

- React Flow v12 GitHub — 节点类型和布局配置
- dagre npm registry — v0.8.5，图布局算法
- Neo4j Python Driver — `src/graph/client.py` 现有查询模式

### Tertiary (LOW confidence)

- 攻击链路可视化最佳实践 — 需要实际安全分析场景验证
- 非专业用户界面设计 — 需要用户测试验证

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部验证 npm 版本
- Architecture: HIGH — 基于锁定决策和现有代码模式
- Pitfalls: MEDIUM — 基于 React Flow 常见问题，需实际验证

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (30 days, stable domain)
