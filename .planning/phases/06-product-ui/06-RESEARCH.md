# Phase 6: 产品级 UI - Research

**研究日期:** 2026-03-25
**Domain:** React 前端工程化、响应式 UI、数据可视化
**Confidence:** MEDIUM-HIGH (基于 v1.0 代码分析 + STACK.md 规划 + 2025 训练数据)

---

## Summary

Phase 6 需要将现有的简单 React 前端（仅支持列表/详情切换，无路由，无状态管理）重构为产品级 UI。

**核心挑战:**
1. **架构升级** - 从单文件 App 演进到路由+状态管理
2. **数据可视化** - 仪表盘需要图表，现有代码零图表能力
3. **多维度筛选** - 需要复杂的前端筛选逻辑
4. **用户偏好** - 需要持久化配置（主题、默认筛选条件等）

**Primary recommendation:** 采用渐进式升级策略，保留现有组件（Card、Button、Badge），引入 React Router v6 做路由、TanStack Query 做数据获取、Recharts 做图表、Zustand 做全局状态。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 私有化离线部署，无外部云依赖
- AI 推理基于私有化 Qwen3-32B
- 非专业运维人员，界面必须极度简单

### Claude's Discretion
- UI 框架选择（shadcn/ui vs Chakra UI vs Ant Design）
- 图表库选择（Recharts vs ECharts vs D3.js）
- 状态管理方案（Redux vs Zustand vs Jotai）

### Deferred Ideas (OUT OF SCOPE)
- Phase 7 的 AI 助手对话框（独立实现）
- Phase 8 的报表导出（PDF/Excel）

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | 响应式布局框架，支持桌面/平板/手机 | Tailwind CSS 已有响应式工具类，需引入 grid/flex 布局系统 |
| UI-02 | 告警仪表盘重构，数据可视化升级 | Recharts 图表库 + 仪表盘组件架构 |
| UI-03 | 告警列表多维度筛选与排序 | TanStack Query + 组合条件筛选模式 |
| UI-04 | 告警详情页全新设计 | 详情页组件重构 + 新布局模式 |
| UI-05 | 用户偏好设置与个性化配置 | Zustand persist + localStorage |

---

## 1. 当前前端技术栈评估

### 1.1 现有依赖

| 库 | 版本 | 状态 | 评估 |
|----|------|------|------|
| react | 18.2 | 保留 | 最新稳定版 |
| react-dom | 18.2 | 保留 | 最新稳定版 |
| vite | 5 | 保留 | 构建工具 |
| tailwindcss | 3.4.19 | 保留 | 响应式基础 |
| lucide-react | 0.263.1 | 保留 | 图标库 |
| typescript | 5 | 保留 | 类型系统 |

### 1.2 现有组件评估

| 组件 | 位置 | 功能 | 需改进 |
|------|------|------|--------|
| `App.tsx` | 根组件 | useState 切换 list/detail 视图 | 无路由，需引入 React Router |
| `AlertList.tsx` | 列表组件 | 基础列表 + 筛选 | 无分页、无虚拟滚动、无 TanStack Query |
| `AlertDetail.tsx` | 详情组件 | 单屏详情 | 布局简单，需全新设计 |
| `Button.tsx` | UI 组件 | 4 variants + 3 sizes | 可保留，参考 shadcn/ui 模式改进 |
| `Card.tsx` | UI 组件 | 基础卡片 | 可保留 |
| `Badge.tsx` | UI 组件 | 严重度徽章 | 可保留 |
| `ChainTimeline.tsx` | 业务组件 | 时间线展示 | 保留，重构样式 |
| `RemediationPanel.tsx` | 业务组件 | 处置建议 | 保留 |
| `api/client.ts` | API 层 | fetch 封装 | 无错误处理、无缓存、无重试 |

### 1.3 关键缺陷

1. **无路由** - 视图切换靠 useState，大型应用不可扩展
2. **无状态管理** - 服务端数据用 useState + useEffect，无缓存
3. **无表单验证** - 用户输入无校验
4. **无数据可视化** - 仪表盘为零
5. **无用户偏好** - 无持久化配置
6. **无响应式优化** - 移动端体验差

---

## 2. Standard Stack

### 2.1 核心依赖

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| react-router-dom | ^6.22.0 | 路由管理 | React 生态事实标准，嵌套路由支持布局组件 |
| @tanstack/react-query | ^5.28.0 | 服务端状态 | 数据获取、缓存、轮询、错误重试一体化 |
| zustand | ^4.5.0 | 全局 UI 状态 | 轻量（零 boilerplate）、TypeScript 原生支持 |
| recharts | ^2.12.0 | 图表可视化 | React 原生、TypeScript 支持好、轻量 |
| react-hook-form | ^7.51.0 | 表单管理 | 性能优于 uncontrolled forms |
| zod | ^3.22.0 | Schema 验证 | 与 TypeScript 一体化 |
| @tanstack/react-virtual | ^3.2.0 | 虚拟列表 | 万级数据不卡顿 |
| sonner | ^1.4.0 | Toast 通知 | 轻量、可访问性好 |

### 2.2 UI 组件库策略

**推荐方案:** 不引入完整 UI 库（如 Ant Design/Material UI），而是采用 shadcn/ui 模式：
- 将组件代码直接复制到项目中
- 可自由修改，无供应商锁定
- 与 Tailwind 完全集成

**需要引入的 Radix UI 原语:**

| 原语 | 用途 |
|------|------|
| @radix-ui/react-dialog | 模态框 |
| @radix-ui/react-dropdown-menu | 下拉菜单 |
| @radix-ui/react-tabs | Tab 切换 |
| @radix-ui/react-select | 选择器 |
| @radix-ui/react-checkbox | 复选框 |
| @radix-ui/react-label | 表单标签 |
| @radix-ui/react-slider | 滑块（用于时间范围） |
| @radix-ui/react-toast | Toast 通知 |
| @radix-ui/react-tooltip | 工具提示 |
| @radix-ui/react-scroll-area | 滚动区域 |

**配套工具:**

| 工具 | 版本 | 用途 |
|------|------|------|
| class-variance-authority | ^0.7.0 | 组件变体管理 |
| clsx | ^2.1.0 | 条件类名拼接 |
| tailwind-merge | ^2.2.0 | Tailwind 类名合并 |

### 2.3 响应式布局

**现有配置 (tailwind.config.js):**
- 仅定义了 primary 颜色
- 无 dark mode
- 无 container 插件

**升级配置:**
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',  // 支持深色模式
  theme: {
    extend: {
      colors: {
        primary: { /* 已有 */ },
        // 严重度颜色（用于图表）
        severity: {
          critical: '#dc2626',
          high: '#f97316',
          medium: '#eab308',
          low: '#6b7280',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // 长文本展示
  ],
}
```

**响应式断点策略:**
- `sm`: 640px - 手机横屏
- `md`: 768px - 平板
- `lg`: 1024px - 桌面
- `xl`: 1280px - 大桌面

### 2.4 用户偏好存储

**方案:** Zustand + localStorage persist

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultSeverity: 'all' | 'critical' | 'high' | 'medium' | 'low';
  defaultTab: 'active' | 'suppressed';
  autoRefresh: boolean;
  refreshInterval: number;  // 秒
}

export const usePreferencesStore = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: 'system',
      defaultSeverity: 'all',
      defaultTab: 'active',
      autoRefresh: true,
      refreshInterval: 60,
      setPreference: (key, value) => set({ [key]: value }),
    }),
    { name: 'secalert-preferences' }
  )
);
```

### 2.5 完整依赖升级

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "recharts": "^2.12.0",
    "@tanstack/react-virtual": "^3.2.0",
    "sonner": "^1.4.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-scroll-area": "^1.0.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.27",
    "tailwindcss": "^3.4.19",
    "@tailwindcss/typography": "^0.5.10",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## 3. Architecture Patterns

### 3.1 推荐的目录结构

```
frontend/src/
├── components/
│   ├── ui/                    # 基础 UI 组件（参考 shadcn/ui）
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── slider.tsx
│   │   ├── tooltip.tsx
│   │   ├── scroll-area.tsx
│   │   └── toast.tsx
│   ├── layout/                # 布局组件
│   │   ├── AppShell.tsx       # 主布局（Header + Sidebar + Content）
│   │   ├── Header.tsx
│   │   └── SettingsDrawer.tsx # 设置抽屉
│   ├── dashboard/             # 仪表盘相关
│   │   ├── DashboardPage.tsx
│   │   ├── StatCard.tsx       # 统计卡片
│   │   ├── AlertTrendChart.tsx
│   │   ├── SeverityPieChart.tsx
│   │   └── TopAttackTypes.tsx
│   ├── alerts/                # 告警相关
│   │   ├── AlertListPage.tsx
│   │   ├── AlertListItem.tsx
│   │   ├── AlertFilters.tsx   # 多维度筛选
│   │   └── AlertDetailPage.tsx
│   └── chat/                  # AI 助手（Phase 7）
│       └── ChatDialog.tsx
├── hooks/
│   ├── useChains.ts           # TanStack Query hooks
│   ├── usePreferences.ts      # 用户偏好 hook
│   └── useVirtualList.ts      # 虚拟列表 hook
├── lib/
│   ├── api.ts                 # API 客户端（增强版）
│   ├── utils.ts               # 工具函数
│   └── cn.ts                  # className 合并
├── pages/                     # 路由页面
│   ├── Dashboard.tsx
│   ├── Alerts.tsx
│   ├── AlertDetail.tsx
│   └── Settings.tsx
├── stores/
│   └── preferencesStore.ts    # Zustand store
├── types/
│   └── index.ts               # 现有类型（保留）
├── App.tsx                    # 根组件（路由配置）
└── main.tsx                   # 入口
```

### 3.2 路由结构

```typescript
// App.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,       // 布局组件
    children: [
      {
        index: true,
        element: <Dashboard />,  // 默认仪表盘
      },
      {
        path: 'alerts',
        element: <AlertList />,
      },
      {
        path: 'alerts/:chainId',
        element: <AlertDetail />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
```

### 3.3 TanStack Query 集成模式

```typescript
// hooks/useChains.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChains, acknowledgeAlert } from '../lib/api';

export function useChains(filters: ChainFilters) {
  return useQuery({
    queryKey: ['chains', filters],
    queryFn: () => fetchChains(filters),
    staleTime: 30000,      // 30秒内不重新请求
    retry: 3,              // 失败重试3次
    refetchInterval: () => preferences.autoRefresh ? 60000 : false,
  });
}

export function useAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chainId, note }: { chainId: string; note?: string }) =>
      acknowledgeAlert(chainId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('已确认');
    },
    onError: () => {
      toast.error('操作失败');
    },
  });
}
```

### 3.4 多维度筛选模式

```typescript
// components/alerts/AlertFilters.tsx
interface FilterState {
  severity: Severity | 'all';
  status: 'active' | 'suppressed' | 'all';
  dateRange: { start: Date; end: Date } | null;
  searchQuery: string;
  sourceType: string | 'all';
  sortBy: 'time' | 'severity' | 'count';
  sortOrder: 'asc' | 'desc';
}

// URL 参数同步
const searchParams = new URLSearchParams(window.location.search);

// 从 URL 恢复筛选状态
const filtersFromUrl: FilterState = {
  severity: (searchParams.get('severity') as Severity) || 'all',
  status: (searchParams.get('status') as FilterState['status']) || 'active',
  // ...
};

// 筛选变化时更新 URL
function updateFilters(newFilters: FilterState) {
  const params = new URLSearchParams();
  Object.entries(newFilters).forEach(([key, value]) => {
    if (value !== 'all' && value !== null) {
      params.set(key, String(value));
    }
  });
  window.history.pushState({}, '', `?${params}`);
}
```

---

## 4. Common Pitfalls

### 4.1 响应式布局陷阱

| 陷阱 | 问题 | 预防 |
|------|------|------|
| **固定宽度** | 在小屏幕上溢出 | 使用 `max-w-full` + `overflow-x-auto` |
| **绝对定位叠加** | 移动端点击区域重叠 | 使用 Flexbox/Grid 而非绝对定位 |
| **hover 依赖** | 触屏设备无法 hover | 确保所有功能有点击触发 |
| **字体过小** | 移动端阅读困难 | 使用 `text-sm` → `md:text-base` 响应式字体 |

### 4.2 TanStack Query 陷阱

| 陷阱 | 问题 | 预防 |
|------|------|------|
| **staleTime 过短** | 请求过多，UI 闪烁 | 根据数据更新频率设置合适的 staleTime |
| **不 invalidate** | mutation 后数据不刷新 | 在 onSuccess 中调用 queryClient.invalidateQueries |
| **全局 loading** | 任何请求都显示全屏 loading | 使用 Suspense 或局部 loading 状态 |
| **不处理 error** | 错误时白屏 | 使用 isError + errorBoundary |

### 4.3 图表陷阱

| 陷阱 | 问题 | 预防 |
|------|------|------|
| **数据量过大** | 渲染 thousands of points | 使用 dataAggregation 或采样 |
| **响应式缺失** | 图表溢出容器 | 使用 ResponsiveContainer |
| **颜色不可访问** | 红绿色盲无法区分 | 使用形状+颜色双重编码 |

---

## 5. Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 条件类名拼接 | `${condition && 'bg-red'}` | `clsx` / `cn()` | 防止 XSS，更安全 |
| Toast 通知 | 自定义 toast 组件 | `sonner` | 可访问性好，移动端适配 |
| 虚拟列表 | 手写 windowing | `@tanstack/react-virtual` | 边界情况处理完善 |
| 表单验证 | 手写 if-else | `react-hook-form` + `zod` | 类型安全，性能好 |
| 日期格式化 | `new Date().toLocaleString()` | `date-fns` | 统一、tree-shakable |

---

## 6. Code Examples

### 6.1 增强版 API 客户端

```typescript
// lib/api.ts
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

export async function fetchChains(filters: ChainFilters): Promise<AttackChainListResponse> {
  const params = new URLSearchParams({
    limit: String(filters.limit || 50),
    offset: String(filters.offset || 0),
  });

  if (filters.severity && filters.severity !== 'all') {
    params.set('severity', filters.severity);
  }
  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }

  const response = await fetch(`${API_BASE}/chains?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.status}`);
  }
  return response.json();
}
```

### 6.2 统计卡片组件

```typescript
// components/dashboard/StatCard.tsx
interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;      // 百分比变化
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, change, changeLabel, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {change !== undefined && (
              <p className={`text-sm mt-1 flex items-center gap-1 ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {change > 0 ? '+' : ''}{change}%
                {changeLabel && <span className="text-slate-500">{changeLabel}</span>}
              </p>
            )}
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.3 仪表盘页面布局

```typescript
// components/dashboard/DashboardPage.tsx
export function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总告警"
          value={data.total}
          change={data.totalChange}
          changeLabel="较上周"
          icon={<AlertTriangle className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="真威胁"
          value={data.truePositives}
          change={data.truePositivesChange}
          icon={<Shield className="w-6 h-6 text-red-500" />}
        />
        <StatCard
          title="误报率"
          value={`${data.falsePositiveRate}%`}
          change={-data.falsePositiveRateChange}
          trend="down"
          icon={<CheckCircle className="w-6 h-6 text-green-500" />}
        />
        <StatCard
          title="处置率"
          value={`${data.resolutionRate}%`}
          change={data.resolutionRateChange}
          trend="up"
          icon={<Clock className="w-6 h-6 text-purple-500" />}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 告警趋势图 - 跨2列 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold">告警趋势</h3>
          </CardHeader>
          <CardContent>
            <AlertTrendChart data={data.trends} />
          </CardContent>
        </Card>

        {/* 严重度分布饼图 */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">严重度分布</h3>
          </CardHeader>
          <CardContent>
            <SeverityPieChart data={data.bySeverity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 6.4 设置抽屉组件

```typescript
// components/layout/SettingsDrawer.tsx
import { Settings } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { usePreferencesStore } from '../../stores/preferencesStore';

export function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const { preferences, setPreference } = usePreferencesStore();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4"
      >
        <Settings className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 主题选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">主题</label>
              <Select
                value={preferences.theme}
                onValueChange={(v) => setPreference('theme', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">浅色</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="system">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 默认严重度 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">默认告警筛选</label>
              <Select
                value={preferences.defaultSeverity}
                onValueChange={(v) => setPreference('defaultSeverity', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 自动刷新 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">自动刷新</p>
                <p className="text-xs text-slate-500">自动刷新告警列表</p>
              </div>
              <Checkbox
                checked={preferences.autoRefresh}
                onCheckedChange={(v) => setPreference('autoRefresh', v)}
              />
            </div>

            {/* 刷新间隔 */}
            {preferences.autoRefresh && (
              <div className="space-y-2">
                <label className="text-sm font-medium">刷新间隔</label>
                <Slider
                  value={[preferences.refreshInterval]}
                  onValueChange={([v]) => setPreference('refreshInterval', v)}
                  min={30}
                  max={300}
                  step={30}
                />
                <p className="text-xs text-slate-500">
                  {preferences.refreshInterval} 秒
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 7. State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单文件 useState 视图切换 | React Router v6 路由 | Phase 6 | URL 可分享，可书签 |
| useState + useEffect 获取数据 | TanStack Query | Phase 6 | 缓存、重试、加载状态 |
| 原生 fetch | 增强 API 客户端 | Phase 6 | 错误处理、类型安全 |
| CSS 变量主题 | Tailwind dark mode | Phase 6 | 系统主题跟随 |
| 原生 select | Radix UI Select | Phase 6 | 可访问性、移动端适配 |

**Deprecated/outdated:**
- CRA (Create React App): Vite 已采用
- classname 库 (需替换为 clsx): 已有 tailwind-merge
- 普通 fetch (需包装): 增强版 api.ts

---

## 8. Open Questions

### 8.1 仪表盘数据源

**问题:** 仪表盘需要的统计数据（总告警数、误报率趋势）是否有现成 API？

**现状:** 根据 `src/analysis/metrics.py`，已有 `FalsePositiveMetricsCollector`，但指标种类有限。

**建议:** 需要与 Phase 5（多数据源）配合扩展 API 或新增 `/api/metrics/dashboard` endpoint。

### 8.2 实时告警推送

**问题:** 是否需要 WebSocket/SSE 实现实时告警推送？

**现状:** 现有方案是轮询（每 60 秒刷新）。

**建议:** Phase 6 MVP 使用轮询，Phase 7 AI 助手可考虑 SSE。

### 8.3 深色模式实现

**问题:** Tailwind dark mode 实现方式选择？

**方案 A:** `class` 策略 - 在 html 添加 `class="dark"` 类
**方案 B:** `media` 策略 - 使用 `@media (prefers-color-scheme: dark)`

**建议:** 使用 `class` 策略，支持手动切换 + 系统跟随。

---

## 9. Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond npm packages)

**分析:** Phase 6 是前端重构，所有依赖通过 npm 安装，无需检查系统级工具。

---

## 10. Validation Architecture

### 10.1 测试框架

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config | `vitest.config.ts` |
| Quick run | `npm run test` |
| Coverage | `npm run test:coverage` |

### 10.2 现有测试基础设施

**检测结果:** 暂无测试配置和测试文件。

**建议 Wave 0 任务:**
1. 安装 Vitest: `npm install -D vitest @vitejs/plugin-react jsdom`
2. 创建 `vitest.config.ts`
3. 创建 `src/test/setup.ts` (React Testing Library 配置)
4. 创建 `src/test/utils.tsx` (测试用 wrapper)

### 10.3 阶段需求 → 测试映射

| Req ID | 行为 | 测试类型 | 自动化命令 | 文件存在? |
|--------|------|----------|------------|----------|
| UI-01 | 响应式断点切换 | Visual/E2E | `npm run test` | 否 |
| UI-02 | 仪表盘渲染图表 | Unit | `vitest run Chart.test.tsx` | 否 |
| UI-03 | 筛选条件同步 URL | Unit | `vitest run Filters.test.tsx` | 否 |
| UI-04 | 详情页加载数据 | Unit | `vitest run AlertDetail.test.tsx` | 否 |
| UI-05 | 偏好设置持久化 | Integration | `vitest run Preferences.test.ts` | 否 |

### 10.4 Wave 0 差距

- [ ] `vitest.config.ts` - Vitest 配置
- [ ] `src/test/setup.ts` - RTL 初始化
- [ ] `src/test/*.test.{ts,tsx}` - 基础测试文件
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react`

---

## Sources

### Primary (HIGH confidence)
- React Router v6 官方文档 - https://reactrouter.com/docs
- TanStack Query 官方文档 - https://tanstack.com/query/latest
- Zustand GitHub - https://github.com/pmndrs/zustand
- Recharts 官方文档 - https://recharts.org

### Secondary (MEDIUM confidence)
- STACK.md - 项目内部技术选型文档
- FEATURES.md - 项目内部功能规划文档
- 现有前端代码逆向分析

### Tertiary (LOW confidence)
- shadcn/ui 最佳实践 - 基于 2025 训练数据，需验证最新模式

---

## Metadata

**Confidence breakdown:**
- Standard Stack: MEDIUM-HIGH - 基于 v1.0 代码和项目文档，库选择主流
- Architecture: HIGH - 路由+状态管理模式成熟
- Pitfalls: MEDIUM - 基于常见 React 开发经验

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days, 技术栈稳定)

---

## 下一步行动

1. **Phase 5 完成后** - 确认仪表盘 API 是否就绪
2. **依赖安装** - 执行 `npm install` 升级依赖
3. **Wave 0 测试** - 搭建 Vitest 测试环境
4. **组件迁移** - 渐进式迁移现有组件到新架构
