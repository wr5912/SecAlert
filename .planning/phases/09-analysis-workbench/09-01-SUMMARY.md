---
phase: 09-analysis-workbench
plan: 01
subsystem: ui
tags: [react, react-flow, zustand, dagre, typescript]

# Dependency graph
requires:
  - phase: 08-reporting
    provides: "前端项目结构、路由系统、现有组件模式"
provides:
  - "智能分析工作台完整前端框架（9个组件、5个页面、完整路由）"
  - "React Flow 攻击链路图集成"
  - "Zustand 全局状态管理"
  - "故事线、攻击图、时间线 API 端点"
affects:
  - "Phase 10 后端联调"
  - "Phase 11 单元测试"

# Tech tracking
tech-stack:
  added:
    - "@xyflow/react (React Flow v12)"
    - "dagre (图布局算法)"
    - "@types/dagre"
  patterns:
    - "三栏布局：NavSidebar + Canvas + AIPanel"
    - "Zustand persist 中间件状态持久化"
    - "StorylineCard -> StorylineList -> AlertCenterPage 组件层级"
    - "ContextPanel 标签页结构 (asset/threat_intel/behavior)"

key-files:
  created:
    - "frontend/src/components/analysis/AnalysisShell.tsx"
    - "frontend/src/components/analysis/NavSidebar.tsx"
    - "frontend/src/components/analysis/AIPanel.tsx"
    - "frontend/src/components/analysis/StorylineCard.tsx"
    - "frontend/src/components/analysis/StorylineList.tsx"
    - "frontend/src/components/analysis/AttackGraph.tsx"
    - "frontend/src/components/analysis/Timeline.tsx"
    - "frontend/src/components/analysis/ContextPanel.tsx"
    - "frontend/src/components/analysis/QueryBuilder.tsx"
    - "frontend/src/components/analysis/HuntingWorkbench.tsx"
    - "frontend/src/pages/AlertCenterPage.tsx"
    - "frontend/src/pages/AttackGraphPage.tsx"
    - "frontend/src/pages/TimelinePage.tsx"
    - "frontend/src/pages/HuntingPage.tsx"
    - "frontend/src/pages/AssetContextPage.tsx"
    - "frontend/src/stores/analysisStore.ts"
    - "frontend/src/api/analysisEndpoints.ts"
    - "frontend/src/types/analysis.ts"
  modified:
    - "frontend/src/App.tsx (新增5个分析路由)"
    - "frontend/package.json (新增依赖)"

key-decisions:
  - "路由使用 /analysis 前缀避免与现有 /alerts 冲突"
  - "ReactFlow 导入使用命名导入 { ReactFlow } 而非默认导入"
  - "ContextPanel 使用 assetId ?? selectedEntityId ?? undefined 优先级链"
  - "analysisStore 使用 get() 避免循环类型引用"

patterns-established:
  - "组件骨架 -> 完善 -> 提交 的增量开发流程"
  - "Mock API 返回空数据结构保持接口一致性"
  - "置信度颜色：>80红/50-80橙/<50灰"

requirements-completed: []

# Metrics
duration: 45min
completed: 2026-03-26
---

# Phase 9: 智能分析工作台 Summary

**React Flow 攻击链路图 + Zustand 全局状态 + 完整分析工作台前端框架（9个可视化组件、5个页面路由）**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-26T06:34:23Z
- **Completed:** 2026-03-26T07:20:00Z
- **Tasks:** 21 wave tasks + 1 fix commit
- **Files modified:** 23 files (+6903 insertions, -169 deletions)

## Accomplishments

- 智能分析工作台完整前端架构（三栏布局：左侧NavSidebar + 中央Canvas + 右侧AIPanel）
- React Flow 攻击链路图组件（dagre布局算法、节点拖拽/缩放、MiniMap）
- 5个分析页面（AlertCenter、AttackGraph、Timeline、Hunting、AssetContext）
- Zustand 全局状态管理（persistence、currentView、selectedEntity、copilotContext）
- 9个核心组件（StorylineCard/StorylineList/AttackGraph/Timeline/NavSidebar/AIPanel/ContextPanel/QueryBuilder/HuntingWorkbench）
- 完整类型定义（Storyline、AttackNode、AttackEdge、TimelineEvent、AISuggestion等）

## Task Commits

1. **W0-01: 依赖安装** - `a149f4f` (feat)
2. **W0-02: 分析模块类型定义** - `2a4cf0e` (feat)
3. **W0-03: Zustand 分析 Store** - `f0fa383` (feat)
4. **W0-04: 分析 API 客户端** - `09cba85` (feat)
5. **W0-05: StorylineCard 骨架** - `5123618` (feat)
6. **W0-06: StorylineList 骨架** - `b4ab1b4` (feat)
7. **W0-07: AttackGraph 骨架** - `04b3e1b` (feat)
8. **W0-08: Timeline 骨架** - `fc98570` (feat)
9. **W0-09: NavSidebar 骨架** - `4d3252f` (feat)
10. **W0-10: AIPanel 骨架** - `8c53022` (feat)
11. **W0-11: ContextPanel 骨架** - `2cc3cc0` (feat)
12. **W0-12: HuntingWorkbench 骨架** - `171a43d` (feat)
13. **W0-13: 测试目录创建** - `ef0d694` (feat)
14. **W0-14: 页面 Stub + QueryBuilder** - `29f3de8` (feat)
15. **Task 1-01: 路由配置 + AnalysisShell** - `06696ae` (feat)
16. **Task 2-01: StorylineCard 完善** - `55e145b` (feat)
17. **Task 2-02: StorylineList 完善** - `d540685` (feat)
18. **Task 2-03: AlertCenterPage 完善** - `672d48c` (feat)
19. **Task 3-02: AttackGraphPage 完善** - `a408eea` (feat)
20. **Task 4-02: TimelinePage 完善** - `951dc66` (feat)
21. **Task 5-02: HuntingPage 完善** - `04b8cab` (feat)
22. **Task 6-02: AssetContextPage 完善** - `68a5a1b` (feat)
23. **Fix: TypeScript errors** - `c713ecc` (fix)

## Files Created/Modified

- `frontend/src/App.tsx` - 新增5个分析路由 (/analysis/alerts, /analysis/graph/:storyId, etc.)
- `frontend/src/components/analysis/AnalysisShell.tsx` - 三栏布局容器
- `frontend/src/components/analysis/NavSidebar.tsx` - 左侧导航 (200px/64px折叠)
- `frontend/src/components/analysis/AIPanel.tsx` - AI Copilot 面板 (320px)
- `frontend/src/components/analysis/StorylineCard.tsx` - 置信度卡片
- `frontend/src/components/analysis/StorylineList.tsx` - 故事线列表 + 筛选
- `frontend/src/components/analysis/AttackGraph.tsx` - React Flow 攻击图
- `frontend/src/components/analysis/Timeline.tsx` - 多轨道时间线
- `frontend/src/components/analysis/ContextPanel.tsx` - 资产上下文面板
- `frontend/src/components/analysis/QueryBuilder.tsx` - 三元组查询构建器
- `frontend/src/components/analysis/HuntingWorkbench.tsx` - 狩猎工作台
- `frontend/src/pages/AlertCenterPage.tsx` - 告警中心页面
- `frontend/src/pages/AttackGraphPage.tsx` - 攻击图页面
- `frontend/src/pages/TimelinePage.tsx` - 时间线页面
- `frontend/src/pages/HuntingPage.tsx` - 狩猎页面
- `frontend/src/pages/AssetContextPage.tsx` - 资产上下文页面
- `frontend/src/stores/analysisStore.ts` - Zustand store
- `frontend/src/api/analysisEndpoints.ts` - API 端点
- `frontend/src/types/analysis.ts` - 类型定义
- `frontend/package.json` - @xyflow/react, dagre, @types/dagre

## Decisions Made

- 路由使用 `/analysis` 前缀避免与现有 `/alerts` 路由冲突
- AnalysisShell 作为分析模块的共享布局组件
- API 函数返回 mock 数据保持接口契约，Phase 10 后端联调时替换
- ContextPanel 同时支持 assetId prop 和 store 中的 selectedEntityId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ReactFlow 类型导入问题**
- **Found during:** TypeScript build verification
- **Issue:** `ReactFlow` 使用默认导入时类型检查失败
- **Fix:** 改用命名导入 `import { ReactFlow, Controls, ... } from '@xyflow/react'`
- **Files modified:** `frontend/src/components/analysis/AttackGraph.tsx`
- **Verification:** `npx tsc --noEmit` 通过
- **Committed in:** `c713ecc` (fix commit)

**2. [Rule 1 - Bug] analysisStore 循环类型引用**
- **Found during:** TypeScript build verification
- **Issue:** `useAnalysisStore.getState()` 在初始化时创建循环类型引用
- **Fix:** 使用 `get()` 参数函数代替直接引用
- **Files modified:** `frontend/src/stores/analysisStore.ts`
- **Verification:** `npx tsc --noEmit` 通过
- **Committed in:** `c713ecc` (fix commit)

**3. [Rule 1 - Bug] ContextPanel fetchAssetContext 参数类型**
- **Found during:** TypeScript build verification
- **Issue:** `targetAssetId` 为 `string | undefined` 但函数需要 `string`
- **Fix:** 使用中间变量 `const assetIdToFetch: string = targetAssetId`
- **Files modified:** `frontend/src/components/analysis/ContextPanel.tsx`
- **Verification:** `npx tsc --noEmit` 通过
- **Committed in:** `c713ecc` (fix commit)

**4. [Rule 2 - Missing] 未使用的导入和变量**
- **Found during:** TypeScript build verification
- **Issue:** 多个文件存在未使用的导入（phaseBadgeColors、selectedStorylineId、setResult等）
- **Fix:** 移除未使用的代码
- **Files modified:** StorylineCard、AlertCenterPage、HuntingWorkbench等
- **Verification:** `npx tsc --noEmit` 通过
- **Committed in:** `c713ecc` (fix commit)

---

**Total deviations:** 4 auto-fixed (1 blocking, 3 code quality)
**Impact on plan:** 所有自动修复对于代码正确性和构建成功必要。无范围蔓延。

## Issues Encountered

- React Flow v12 的类型导出方式与之前版本不同，需要使用命名导入
- Zustand persist middleware 与复杂类型组合时的循环引用问题

## Next Phase Readiness

- 前端框架完整，可进行 Phase 10 后端联调
- API 端点已定义，mock 数据已返回正确结构
- 路由配置完成，支持 deep link
- 状态管理已就绪，Phase 10 可直接调用 API

---
*Phase: 09-analysis-workbench*
*Completed: 2026-03-26*
