---
phase: "06"
plan: "06"
subsystem: frontend
tags:
  - react-router-dom
  - tanstack-query
  - zustand
  - recharts
  - radix-ui
  - product-ui
dependency_graph:
  requires: []
  provides:
    - path: frontend/src/lib/api.ts
      description: 增强版 API 客户端，集成 TanStack Query
    - path: frontend/src/stores/preferencesStore.ts
      description: Zustand 用户偏好 Store
    - path: frontend/src/components/layout/AppShell.tsx
      description: 主布局组件
    - path: frontend/src/pages/DashboardPage.tsx
      description: 仪表盘页面
    - path: frontend/src/pages/AlertListPage.tsx
      description: 告警列表页面
    - path: frontend/src/pages/AlertDetailPage.tsx
      description: 告警详情页面
    - path: frontend/src/pages/SettingsPage.tsx
      description: 设置页面
  affects:
    - frontend/src/App.tsx
    - frontend/src/main.tsx
tech_stack:
  added:
    - react-router-dom@6.30.3
    - @tanstack/react-query@5.95.2
    - zustand@4.5.7
    - recharts@2.15.4
    - @radix-ui/* (multiple packages)
    - sonner@1.4.0
    - clsx, tailwind-merge, class-variance-authority
    - @tailwindcss/typography
    - date-fns
  patterns:
    - React Router createBrowserRouter 路由配置
    - TanStack Query useQuery 数据获取
    - Zustand persist middleware localStorage 持久化
    - Recharts 图表库
key_files:
  created:
    - frontend/src/lib/cn.ts
    - frontend/src/lib/utils.ts
    - frontend/src/lib/api.ts
    - frontend/src/stores/preferencesStore.ts
    - frontend/src/components/layout/Header.tsx
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/dashboard/StatCard.tsx
    - frontend/src/components/dashboard/AlertTrendChart.tsx
    - frontend/src/components/dashboard/SeverityPieChart.tsx
    - frontend/src/components/alerts/AlertFilters.tsx
    - frontend/src/pages/DashboardPage.tsx
    - frontend/src/pages/AlertListPage.tsx
    - frontend/src/pages/AlertDetailPage.tsx
    - frontend/src/pages/SettingsPage.tsx
  modified:
    - frontend/src/App.tsx
    - frontend/src/main.tsx
    - frontend/tailwind.config.js
    - frontend/src/components/ui/Card.tsx
decisions:
  - 使用 React Router createBrowserRouter 实现路由
  - 使用 TanStack Query 统一数据获取和缓存
  - 使用 Zustand persist 实现用户偏好持久化
  - 使用 Recharts 实现仪表盘图表
metrics:
  duration_minutes: ~5
  completed: "2026-03-25T12:17:00Z"
---

# Phase 06 Plan 06: 产品级 UI 重构完成

## 一句话描述
将简陋的单文件 React App 重构为产品级前端架构，包含路由系统、状态管理、数据可视化、响应式布局。

## 任务完成情况

| 任务 | 名称 | 状态 | Commit |
|------|------|------|--------|
| 1 | 安装核心依赖 | 完成 | 1dce2d4 |
| 2 | 升级 Tailwind 配置 | 完成 | 4702942 |
| 3 | 创建工具函数 | 完成 | bd25555 |
| 4 | 创建 Zustand 用户偏好 Store | 完成 | 0cd0339 |
| 5 | 重构 API 客户端 | 完成 | 02fd4e0 |
| 6 | 创建布局组件 | 完成 | 6d58a51 |
| 7 | 创建仪表盘页面 | 完成 | 83166ed |
| 8 | 创建告警列表页面 | 完成 | 26c1435 |
| 9 | 创建告警详情页面 | 完成 | f9efdde |
| 10 | 创建设置页面 | 完成 | 82f1a1f |
| 11 | 配置 React Router | 完成 | 68979a2 |
| 12 | 验证前端构建 | 完成 | a3dace7 |

## 架构变更

### 路由系统
```
/                    -> DashboardPage (仪表盘)
/alerts              -> AlertListPage (告警列表)
/alerts/:chainId    -> AlertDetailPage (告警详情)
/settings            -> SettingsPage (设置)
```

### 状态管理
- **TanStack Query**: 统一的数据获取和缓存
- **Zustand + Persist**: 用户偏好持久化到 localStorage

### 组件结构
```
AppShell
├── Header (导航栏)
└── Outlet
    ├── DashboardPage
    │   ├── StatCard (统计卡片)
    │   ├── AlertTrendChart (趋势图)
    │   └── SeverityPieChart (饼图)
    ├── AlertListPage
    │   └── AlertFilters (筛选组件)
    ├── AlertDetailPage
    │   ├── ChainTimeline (时间线)
    │   └── RemediationPanel (处置建议)
    └── SettingsPage
```

## 功能实现

- [x] 仪表盘显示统计数据（总告警数、真威胁数、误报率、处置率）
- [x] 仪表盘显示告警趋势图表和严重度分布饼图
- [x] 告警列表支持按严重度、状态、来源类型、关键词筛选
- [x] 筛选条件与 URL 参数同步，可分享链接
- [x] 告警详情页展示完整的攻击链时间线和处置建议
- [x] 用户可以在界面设置中切换主题（浅色/深色/系统）
- [x] 用户偏好持久化保存到 localStorage
- [x] 响应式布局支持桌面、平板、手机

## 技术栈更新

### 新增依赖
- **路由**: react-router-dom@6.30.3
- **数据获取**: @tanstack/react-query@5.95.2
- **状态管理**: zustand@4.5.7
- **图表**: recharts@2.15.4
- **UI 原语**: @radix-ui/* (dialog, dropdown-menu, tabs, select, checkbox, slider, tooltip, scroll-area)
- **Toast**: sonner@1.4.0
- **工具**: clsx, tailwind-merge, class-variance-authority
- **Tailwind 插件**: @tailwindcss/typography
- **日期**: date-fns

### Tailwind 配置更新
- 添加 `darkMode: 'class'` 支持深色模式
- 添加 `severity` 颜色定义（critical/high/medium/low）

## 构建验证

```
npm run build 成功
- TypeScript 编译通过
- Vite 构建完成
- 产物生成在 dist/ 目录
```

## 后续工作

- 集成后端 API `/api/metrics/dashboard` 真实数据
- 完善告警列表的后端筛选 API
- 添加更多图表类型和交互功能
