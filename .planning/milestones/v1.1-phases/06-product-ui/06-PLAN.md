---
phase: 06-product-ui
plan: "06"
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/package.json
  - frontend/tailwind.config.js
  - frontend/src/App.tsx
  - frontend/src/main.tsx
  - frontend/src/types/index.ts
  - frontend/src/api/client.ts
autonomous: false
requirements:
  - UI-01
  - UI-02
  - UI-03
  - UI-04
  - UI-05

must_haves:
  truths:
    - "用户可以通过 URL 直接访问仪表盘、告警列表、告警详情页面"
    - "仪表盘显示统计数据（总告警数、真威胁数、误报率、处置率）"
    - "仪表盘显示告警趋势图表和严重度分布饼图"
    - "告警列表支持按严重度、状态、来源类型、关键词筛选"
    - "筛选条件与 URL 参数同步，可分享链接"
    - "告警详情页展示完整的攻击链时间线和处置建议"
    - "用户可以在界面设置中切换主题（浅色/深色/系统）"
    - "用户偏好（主题、默认筛选条件）持久化保存"
  artifacts:
    - path: "frontend/src/lib/api.ts"
      provides: "增强版 API 客户端，集成 TanStack Query"
      exports: ["queryClient", "fetchChains", "fetchChainById", "fetchMetrics"]
    - path: "frontend/src/stores/preferencesStore.ts"
      provides: "Zustand 用户偏好 Store"
      exports: ["usePreferencesStore"]
    - path: "frontend/src/components/layout/AppShell.tsx"
      provides: "主布局组件（Header + Sidebar + Content）"
    - path: "frontend/src/pages/DashboardPage.tsx"
      provides: "仪表盘页面，含统计卡片和图表"
    - path: "frontend/src/pages/AlertListPage.tsx"
      provides: "告警列表页面，含多维度筛选"
    - path: "frontend/src/pages/AlertDetailPage.tsx"
      provides: "告警详情页面"
    - path: "frontend/src/pages/SettingsPage.tsx"
      provides: "设置页面"
    - path: "frontend/src/components/dashboard/AlertTrendChart.tsx"
      provides: "告警趋势折线图"
    - path: "frontend/src/components/dashboard/SeverityPieChart.tsx"
      provides: "严重度分布饼图"
  key_links:
    - from: "App.tsx"
      to: "react-router-dom"
      via: "createBrowserRouter 配置"
      pattern: "createBrowserRouter"
    - from: "DashboardPage.tsx"
      to: "/api/metrics/dashboard"
      via: "TanStack Query useQuery"
      pattern: "useQuery.*queryKey.*metrics"
    - from: "AlertListPage.tsx"
      to: "URL searchParams"
      via: "筛选条件与 URL 同步"
      pattern: "useSearchParams"
    - from: "preferencesStore"
      to: "localStorage"
      via: "Zustand persist middleware"
      pattern: "persist.*localStorage"
---

<objective>
重构前端为产品级 UI，引入路由、状态管理、数据可视化，实现响应式布局、仪表盘、告警列表多维度筛选、详情页全新设计、用户偏好持久化。

Purpose: 将简陋的单文件 React App 升级为可扩展的产品级前端架构
Output: 完整的前端重构，包含路由系统、状态管理、数据可视化、响应式布局
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-product-ui/06-RESEARCH.md
@frontend/src/App.tsx
@frontend/src/api/client.ts
@frontend/src/types/index.ts
@frontend/package.json
@frontend/tailwind.config.js

<interfaces>
<!-- 现有类型定义（保留供下游使用） -->
From frontend/src/types/index.ts:
```typescript
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ViewMode = 'list' | 'detail';
export interface AttackChain { /* 完整定义见文件 */ }
export interface AttackChainListResponse { chains: AttackChain[]; total: number; }
```

<!-- 新增 API 类型 -->
From frontend/src/lib/api.ts (新增):
```typescript
export interface DashboardMetrics {
  total: number;
  truePositives: number;
  falsePositiveRate: number;
  resolutionRate: number;
  trends: { time: string; count: number }[];
  bySeverity: { severity: Severity; count: number }[];
}

export interface ChainFilters {
  severity?: Severity | 'all';
  status?: 'active' | 'suppressed' | 'all';
  sourceType?: string | 'all';
  searchQuery?: string;
  dateRange?: { start: string; end: string };
  sortBy?: 'time' | 'severity' | 'count';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

<!-- 用户偏好 Store -->
From frontend/src/stores/preferencesStore.ts (新增):
```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultSeverity: Severity | 'all';
  defaultTab: 'active' | 'suppressed';
  autoRefresh: boolean;
  refreshInterval: number;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

export function usePreferencesStore(): UserPreferences;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 安装核心依赖</name>
  <files>frontend/package.json</files>
  <read_first>frontend/package.json</read_first>
  <action>
    在 frontend 目录执行 npm install 安装以下依赖：

    核心路由与状态管理：
    - react-router-dom@^6.22.0
    - @tanstack/react-query@^5.28.0
    - zustand@^4.5.0

    表单与验证：
    - react-hook-form@^7.51.0
    - @hookform/resolvers@^3.3.0
    - zod@^3.22.0

    UI 组件原语（Radix UI）：
    - @radix-ui/react-dialog@^1.0.5
    - @radix-ui/react-dropdown-menu@^2.0.6
    - @radix-ui/react-tabs@^1.0.4
    - @radix-ui/react-select@^2.0.0
    - @radix-ui/react-checkbox@^1.0.4
    - @radix-ui/react-slider@^1.1.2
    - @radix-ui/react-tooltip@^1.0.7
    - @radix-ui/react-scroll-area@^1.0.5

    图表与 Toast：
    - recharts@^2.12.0
    - sonner@^1.4.0

    工具库：
    - clsx@^2.1.0
    - tailwind-merge@^2.2.0
    - class-variance-authority@^0.7.0

    开发依赖：
    - @tailwindcss/typography@^0.5.10
    - date-fns@^3.3.0
  </action>
  <verify>
    <automated>cd /home/admin/work/SecAlert/frontend && npm list react-router-dom @tanstack/react-query zustand recharts --depth=0 2>&1 | grep -E "react-router-dom|@tanstack/react-query|zustand|recharts"</automated>
  </verify>
  <acceptance_criteria>
    - npm install 执行成功，无报错
    - package.json 包含所有新依赖
  </acceptance_criteria>
  <done>所有核心依赖安装完成</done>
</task>

<task type="auto">
  <name>Task 2: 升级 Tailwind 配置</name>
  <files>frontend/tailwind.config.js</files>
  <read_first>frontend/tailwind.config.js</read_first>
  <action>
    重写 frontend/tailwind.config.js，添加以下配置：

    1. darkMode: 'class'（支持深色模式切换）
    2. 扩展 colors.severity：
       - critical: '#dc2626'
       - high: '#f97316'
       - medium: '#eab308'
       - low: '#6b7280'
    3. plugins: [require('@tailwindcss/typography')]

    保留现有 primary 颜色配置不变。
  </action>
  <verify>
    <automated>grep -c "darkMode.*class" /home/admin/work/SecAlert/frontend/tailwind.config.js && grep -c "severity:" /home/admin/work/SecAlert/frontend/tailwind.config.js && grep -c "@tailwindcss/typography" /home/admin/work/SecAlert/frontend/tailwind.config.js</automated>
  </verify>
  <acceptance_criteria>
    - tailwind.config.js 包含 darkMode: 'class'
    - tailwind.config.js 包含 severity 颜色定义
    - tailwind.config.js 引入 typography 插件
  </acceptance_criteria>
  <done>Tailwind 配置升级完成，支持深色模式和 severity 颜色</done>
</task>

<task type="auto">
  <name>Task 3: 创建工具函数</name>
  <files>frontend/src/lib/utils.ts, frontend/src/lib/cn.ts</files>
  <read_first></read_first>
  <action>
    创建 frontend/src/lib/ 目录（如果不存在），并创建以下文件：

    1. frontend/src/lib/cn.ts - className 合并工具：
    ```typescript
    import { clsx } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    export function cn(...inputs: Parameters<typeof clsx>) {
      return twMerge(clsx(inputs));
    }
    ```

    2. frontend/src/lib/utils.ts - 通用工具函数：
    ```typescript
    import { format, formatDistanceToNow, parseISO } from 'date-fns';
    import { zhCN } from 'date-fns/locale';

    export function formatDate(date: string | Date, pattern = 'yyyy-MM-dd HH:mm'): string {
      const d = typeof date === 'string' ? parseISO(date) : date;
      return format(d, pattern, { locale: zhCN });
    }

    export function formatRelativeTime(date: string | Date): string {
      const d = typeof date === 'string' ? parseISO(date) : date;
      return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
    }
    ```
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/lib/cn.ts && test -f /home/admin/work/SecAlert/frontend/src/lib/utils.ts && grep -c "export function cn" /home/admin/work/SecAlert/frontend/src/lib/cn.ts</automated>
  </verify>
  <acceptance_criteria>
    - frontend/src/lib/cn.ts 存在并导出 cn 函数
    - frontend/src/lib/utils.ts 存在并导出 formatDate, formatRelativeTime 函数
  </acceptance_criteria>
  <done>工具函数创建完成</done>
</task>

<task type="auto">
  <name>Task 4: 创建 Zustand 用户偏好 Store</name>
  <files>frontend/src/stores/preferencesStore.ts</files>
  <read_first></read_first>
  <action>
    创建 frontend/src/stores/preferencesStore.ts：

    使用 Zustand 的 persist middleware，存储到 localStorage key 'secalert-preferences'。

    Store 包含以下偏好：
    - theme: 'light' | 'dark' | 'system'（默认 'system'）
    - defaultSeverity: Severity | 'all'（默认 'all'）
    - defaultTab: 'active' | 'suppressed'（默认 'active'）
    - autoRefresh: boolean（默认 true）
    - refreshInterval: number（默认 60 秒）

    提供 setPreference 方法更新单个偏好。

    必须使用 `import { create } from 'zustand'` 和 `import { persist } from 'zustand/middleware'`。
  </action>
  <verify>
    <automated>grep -c "export.*usePreferencesStore" /home/admin/work/SecAlert/frontend/src/stores/preferencesStore.ts && grep -c "persist" /home/admin/work/SecAlert/frontend/src/stores/preferencesStore.ts</automated>
  </verify>
  <acceptance_criteria>
    - preferencesStore.ts 存在并导出 usePreferencesStore
    - 使用 Zustand persist middleware
    - 包含 theme, defaultSeverity, autoRefresh, refreshInterval 字段
    - 提供 setPreference 方法
  </acceptance_criteria>
  <done>Zustand 用户偏好 Store 创建完成</done>
</task>

<task type="auto">
  <name>Task 5: 重构 API 客户端</name>
  <files>frontend/src/lib/api.ts</files>
  <read_first>frontend/src/api/client.ts</read_first>
  <action>
    重写 frontend/src/api/client.ts 为 frontend/src/lib/api.ts：

    1. 创建 TanStack QueryClient 配置：
    ```typescript
    import { QueryClient } from '@tanstack/react-query';

    export const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30000,
          retry: 3,
          refetchOnWindowFocus: false,
        },
      },
    });
    ```

    2. 创建 ChainFilters 类型和 fetchChains 函数（保留原有逻辑）

    3. 创建 fetchChainById 函数获取单个告警链详情

    4. 创建 fetchMetrics 函数获取仪表盘数据（模拟返回 DashboardMetrics 类型）

    5. 创建 fetchRemediation, acknowledgeAlert, restoreAlert 函数（保留原有逻辑）

    API_BASE 保持为 '/api'。

    所有函数返回 Promise，使用 fetch API。
  </action>
  <verify>
    <automated>grep -c "QueryClient" /home/admin/work/SecAlert/frontend/src/lib/api.ts && grep -c "export.*fetchChains" /home/admin/work/SecAlert/frontend/src/lib/api.ts && grep -c "export.*fetchMetrics" /home/admin/work/SecAlert/frontend/src/lib/api.ts</automated>
  </verify>
  <acceptance_criteria>
    - lib/api.ts 存在并导出 queryClient
    - 导出 fetchChains, fetchChainById, fetchMetrics 函数
    - 保留 fetchRemediation, acknowledgeAlert, restoreAlert 函数
  </acceptance_criteria>
  <done>API 客户端重构完成，集成 TanStack Query</done>
</task>

<task type="auto">
  <name>Task 6: 创建布局组件 AppShell</name>
  <files>frontend/src/components/layout/AppShell.tsx, frontend/src/components/layout/Header.tsx</files>
  <read_first>frontend/src/components/AlertList.tsx</read_first>
  <action>
    创建 frontend/src/components/layout/ 目录并创建以下组件：

    1. Header.tsx - 顶部导航栏：
    ```typescript
    import { Shield } from 'lucide-react';
    import { Link, useLocation } from 'react-router-dom';
    import { cn } from '../../lib/cn';

    const navItems = [
      { path: '/', label: '仪表盘' },
      { path: '/alerts', label: '告警列表' },
      { path: '/settings', label: '设置' },
    ];

    export function Header() {
      const location = useLocation();

      return (
        <header className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-semibold text-slate-900">SecAlert</h1>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      );
    }
    ```

    2. AppShell.tsx - 主布局：
    ```typescript
    import { Outlet } from 'react-router-dom';
    import { Header } from './Header';

    export function AppShell() {
      return (
        <div className="min-h-screen bg-slate-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-6">
            <Outlet />
          </main>
        </div>
      );
    }
    ```

    组件放在 frontend/src/components/layout/ 目录。
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/components/layout/Header.tsx && test -f /home/admin/work/SecAlert/frontend/src/components/layout/AppShell.tsx && grep -c "export function Header" /home/admin/work/SecAlert/frontend/src/components/layout/Header.tsx</automated>
  </verify>
  <acceptance_criteria>
    - Header.tsx 存在，包含 Logo 和导航链接
    - AppShell.tsx 存在，使用 React Router Outlet
    - 导航高亮当前页面
  </acceptance_criteria>
  <done>布局组件创建完成</done>
</task>

<task type="auto">
  <name>Task 7: 创建仪表盘页面</name>
  <files>frontend/src/pages/DashboardPage.tsx, frontend/src/components/dashboard/StatCard.tsx, frontend/src/components/dashboard/AlertTrendChart.tsx, frontend/src/components/dashboard/SeverityPieChart.tsx</files>
  <read_first>frontend/src/types/index.ts</read_first>
  <action>
    创建 frontend/src/pages/DashboardPage.tsx 和相关组件：

    1. StatCard.tsx - 统计卡片组件：
    - Props: title, value, change?, changeLabel?, icon, trend?
    - 显示标题、数值、变化百分比、图标
    - 使用 Card 组件

    2. AlertTrendChart.tsx - 告警趋势折线图：
    - 使用 Recharts 的 LineChart
    - Props: data: { time: string; count: number }[]
    - X 轴时间，Y 轴告警数量
    - 使用 ResponsiveContainer 自适应宽度

    3. SeverityPieChart.tsx - 严重度分布饼图：
    - 使用 Recharts 的 PieChart
    - Props: data: { severity: Severity; count: number }[]
    - 使用 severity 颜色
    - 显示各严重度占比

    4. DashboardPage.tsx - 仪表盘页面：
    - 使用 useQuery 获取 /api/metrics/dashboard 数据
    - 显示 4 个 StatCard（总告警、真威胁、误报率、处置率）
    - 显示 AlertTrendChart 和 SeverityPieChart
    - 使用 grid 布局响应式（1列手机、2列平板、4列桌面）
    - 数据加载中显示 Skeleton

    模拟数据（API 未实现前）：
    ```typescript
    const mockMetrics: DashboardMetrics = {
      total: 1234,
      truePositives: 89,
      falsePositiveRate: 72.8,
      resolutionRate: 85.3,
      trends: [
        { time: '2024-01-01', count: 120 },
        { time: '2024-01-02', count: 98 },
        // ...
      ],
      bySeverity: [
        { severity: 'critical', count: 45 },
        { severity: 'high', count: 123 },
        { severity: 'medium', count: 234 },
        { severity: 'low', count: 456 },
      ],
    };
    ```
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/pages/DashboardPage.tsx && test -f /home/admin/work/SecAlert/frontend/src/components/dashboard/AlertTrendChart.tsx && test -f /home/admin/work/SecAlert/frontend/src/components/dashboard/SeverityPieChart.tsx && grep -c "export function DashboardPage" /home/admin/work/SecAlert/frontend/src/pages/DashboardPage.tsx</automated>
  </verify>
  <acceptance_criteria>
    - DashboardPage.tsx 存在并导出
    - AlertTrendChart.tsx 使用 Recharts LineChart
    - SeverityPieChart.tsx 使用 Recharts PieChart
    - 页面响应式布局（grid-cols-1 md:grid-cols-2 lg:grid-cols-4）
  </acceptance_criteria>
  <done>仪表盘页面创建完成</done>
</task>

<task type="auto">
  <name>Task 8: 创建告警列表页面</name>
  <files>frontend/src/pages/AlertListPage.tsx, frontend/src/components/alerts/AlertFilters.tsx</files>
  <read_first>frontend/src/components/AlertList.tsx</read_first>
  <action>
    创建 frontend/src/pages/AlertListPage.tsx 和 frontend/src/components/alerts/AlertFilters.tsx：

    1. AlertFilters.tsx - 多维度筛选组件：
    - 使用 Radix UI Select 实现严重度选择（all/critical/high/medium/low）
    - 使用 Radix UI Tabs 实现状态切换（active/suppressed）
    - 使用 Input 实现关键词搜索
    - 使用 Radix UI Select 实现来源类型筛选
    - 筛选变化时更新 URL searchParams
    - 从 URL 恢复筛选状态

    2. AlertListPage.tsx - 告警列表页面：
    - 使用 useSearchParams 获取当前筛选条件
    - 使用 useQuery 获取告警列表数据
    - 显示 AlertFilters 筛选组件
    - 列表使用 map 渲染 AlertListItem
    - 点击告警项跳转到 /alerts/:chainId
    - 响应式布局

    筛选状态结构：
    ```typescript
    interface FilterState {
      severity: Severity | 'all';
      status: 'active' | 'suppressed' | 'all';
      sourceType: string | 'all';
      search: string;
      sortBy: 'time' | 'severity' | 'count';
      sortOrder: 'asc' | 'desc';
    }
    ```

    URL 参数映射：
    - severity -> ?severity=critical
    - status -> ?status=active
    - search -> ?search=关键词
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/pages/AlertListPage.tsx && test -f /home/admin/work/SecAlert/frontend/src/components/alerts/AlertFilters.tsx && grep -c "useSearchParams" /home/admin/work/SecAlert/frontend/src/pages/AlertListPage.tsx</automated>
  </verify>
  <acceptance_criteria>
    - AlertListPage.tsx 存在并导出
    - AlertFilters.tsx 存在并实现多维度筛选
    - 筛选条件与 URL searchParams 同步
    - 支持严重度、状态、关键词筛选
  </acceptance_criteria>
  <done>告警列表页面创建完成</done>
</task>

<task type="auto">
  <name>Task 9: 创建告警详情页面</name>
  <files>frontend/src/pages/AlertDetailPage.tsx</files>
  <read_first>frontend/src/components/AlertDetail.tsx, frontend/src/components/ChainTimeline.tsx, frontend/src/components/RemediationPanel.tsx</read_first>
  <action>
    重构 frontend/src/components/AlertDetail.tsx 为 frontend/src/pages/AlertDetailPage.tsx：

    1. 使用 useParams 获取 chainId
    2. 使用 useQuery 获取告警详情数据
    3. 布局采用响应式设计：
       - 桌面端：左侧主要信息 + 右侧处置建议
       - 移动端：垂直堆叠
    4. 保留 ChainTimeline 组件用于展示攻击链时间线
    5. 保留 RemediationPanel 组件用于处置建议
    6. 添加"返回"按钮返回告警列表

    页面结构：
    ```typescript
    // 响应式 grid
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 主要信息 - 跨2列 */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>告警详情</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 告警基本信息 */}
          </CardContent>
        </Card>
        <ChainTimeline />
      </div>

      {/* 处置建议 - 1列 */}
      <div>
        <RemediationPanel />
      </div>
    </div>
    ```
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/pages/AlertDetailPage.tsx && grep -c "useParams" /home/admin/work/SecAlert/frontend/src/pages/AlertDetailPage.tsx && grep -c "ChainTimeline" /home/admin/work/SecAlert/frontend/src/pages/AlertDetailPage.tsx</automated>
  </verify>
  <acceptance_criteria>
    - AlertDetailPage.tsx 存在并导出
    - 使用 useParams 获取 chainId
    - 集成 ChainTimeline 和 RemediationPanel
    - 响应式布局（lg:grid-cols-3）
  </acceptance_criteria>
  <done>告警详情页面创建完成</done>
</task>

<task type="auto">
  <name>Task 10: 创建设置页面</name>
  <files>frontend/src/pages/SettingsPage.tsx</files>
  <read_first></read_first>
  <action>
    创建 frontend/src/pages/SettingsPage.tsx：

    使用 usePreferencesStore 获取当前偏好设置。

    设置项：
    1. 主题选择 - 使用 Radix UI Select（浅色/深色/跟随系统）
    2. 默认告警筛选 - 使用 Radix UI Select（全部/Critical/High/Medium/Low）
    3. 自动刷新开关 - 使用 Radix UI Checkbox
    4. 刷新间隔 - 使用 Radix UI Slider（30-300秒，步长30）

    页面使用 Card 组件组织，设置项之间用 space-y-6 分隔。

    实现主题切换功能：
    ```typescript
    const { theme, setPreference } = usePreferencesStore();

    useEffect(() => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // system: 跟随系统
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    }, [theme]);
    ```

    页面标题："偏好设置"，包含返回仪表盘链接。
  </action>
  <verify>
    <automated>test -f /home/admin/work/SecAlert/frontend/src/pages/SettingsPage.tsx && grep -c "export function SettingsPage" /home/admin/work/SecAlert/frontend/src/pages/SettingsPage.tsx && grep -c "usePreferencesStore" /home/admin/work/SecAlert/frontend/src/pages/SettingsPage.tsx</automated>
  </verify>
  <acceptance_criteria>
    - SettingsPage.tsx 存在并导出
    - 使用 usePreferencesStore 获取和设置偏好
    - 实现主题切换功能（浅色/深色/系统）
    - 包含自动刷新开关和刷新间隔设置
  </acceptance_criteria>
  <done>设置页面创建完成</done>
</task>

<task type="auto">
  <name>Task 11: 配置 React Router</name>
  <files>frontend/src/App.tsx, frontend/src/main.tsx</files>
  <read_first>frontend/src/App.tsx, frontend/src/main.tsx</read_first>
  <action>
    重写 frontend/src/App.tsx：

    ```typescript
    import { createBrowserRouter, RouterProvider } from 'react-router-dom';
    import { QueryClientProvider } from '@tanstack/react-query';
    import { Toaster } from 'sonner';
    import { queryClient } from './lib/api';
    import { AppShell } from './components/layout/AppShell';
    import { DashboardPage } from './pages/DashboardPage';
    import { AlertListPage } from './pages/AlertListPage';
    import { AlertDetailPage } from './pages/AlertDetailPage';
    import { SettingsPage } from './pages/SettingsPage';

    const router = createBrowserRouter([
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'alerts',
            element: <AlertListPage />,
          },
          {
            path: 'alerts/:chainId',
            element: <AlertDetailPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
    ]);

    export default function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </QueryClientProvider>
      );
    }
    ```

    更新 frontend/src/main.tsx 添加 dark mode 初始化：

    在 main.tsx 入口添加：
    ```typescript
    // 初始化 dark mode（跟随系统）
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
    ```
  </action>
  <verify>
    <automated>grep -c "createBrowserRouter" /home/admin/work/SecAlert/frontend/src/App.tsx && grep -c "QueryClientProvider" /home/admin/work/SecAlert/frontend/src/App.tsx && grep -c "RouterProvider" /home/admin/work/SecAlert/frontend/src/App.tsx</automated>
  </verify>
  <acceptance_criteria>
    - App.tsx 使用 createBrowserRouter 配置路由
    - 路由包含：/（仪表盘）、/alerts、/alerts/:chainId、/settings
    - 使用 QueryClientProvider 包裹
    - main.tsx 初始化 dark mode
  </acceptance_criteria>
  <done>React Router 配置完成</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 12: 验证前端构建</name>
  <files>frontend/src</files>
  <action>
    执行前端构建验证所有代码正确：

    1. 运行 `cd frontend && npm run build`
    2. 检查是否有 TypeScript 编译错误
    3. 确认构建产物生成在 dist 目录

    如果构建失败，修复以下常见问题：
    - 缺失的类型导入
    - 错误的 import 路径
    - 循环依赖
  </action>
  <verify>
    <automated>cd /home/admin/work/SecAlert/frontend && npm run build 2>&amp;1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - npm run build 成功，无 TypeScript 错误
    - dist 目录生成构建产物
  </acceptance_criteria>
  <done>前端构建验证完成</done>
  <what-built>完整的 React Router + TanStack Query + Zustand 前端架构</what-built>
  <how-to-verify>
    1. 运行 `cd frontend &amp;&amp; npm run build` 验证构建成功
    2. 检查终端输出无 TypeScript 错误
    3. 验证构建产物生成在 dist 目录

    如果构建失败：
    - 检查是否有缺失的类型导入
    - 检查 import 路径是否正确
    - 检查是否有循环依赖
  </how-to-verify>
  <resume-signal>Type "approved" 或描述构建错误</resume-signal>
</task>

</tasks>

<verification>
- [ ] npm install 成功，无报错
- [ ] Tailwind 配置包含 darkMode 和 severity 颜色
- [ ] 所有页面和组件文件存在
- [ ] React Router 路由配置正确
- [ ] TanStack Query 集成
- [ ] Zustand persist Store 创建
- [ ] npm run build 成功
</verification>

<success_criteria>
- 用户可以直接访问 / 看到仪表盘
- 用户可以直接访问 /alerts 看到告警列表
- 用户可以直接访问 /alerts/:chainId 看到告警详情
- 用户可以直接访问 /settings 看到设置页面
- 仪表盘显示统计卡片和图表（趋势图、饼图）
- 告警列表支持多维度筛选（严重度、状态、关键词）
- 筛选条件与 URL 同步，可分享链接
- 设置页面可以切换主题（浅色/深色/系统）
- 用户偏好持久化保存到 localStorage
- 响应式布局支持桌面、平板、手机
</success_criteria>

<output>
After completion, create `.planning/phases/06-product-ui/06-SUMMARY.md`
</output>
