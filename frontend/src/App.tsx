/**
 * SecAlert 主应用入口
 * 配置 React Router 路由系统
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/api';
import { AppShell } from './components/layout/AppShell';
import { AnalysisShell } from './components/analysis/AnalysisShell';
import { DashboardPage } from './pages/DashboardPage';
import { AlertListPage } from './pages/AlertListPage';
import { AlertDetailPage } from './pages/AlertDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertCenterPage } from './pages/AlertCenterPage';
import { AttackGraphPage } from './pages/AttackGraphPage';
import { TimelinePage } from './pages/TimelinePage';
import { HuntingPage } from './pages/HuntingPage';
import { AssetContextPage } from './pages/AssetContextPage';

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
  // 分析工作台路由 - 使用 AnalysisShell 三栏布局
  {
    path: '/analysis',
    element: <AnalysisShell />,
    children: [
      {
        index: true,
        element: <AlertCenterPage />,
      },
      {
        path: 'alerts',
        element: <AlertCenterPage />,
      },
      {
        path: 'graph/:storyId',
        element: <AttackGraphPage />,
      },
      {
        path: 'timeline',
        element: <TimelinePage />,
      },
      {
        path: 'hunting',
        element: <HuntingPage />,
      },
      {
        path: 'assets/:assetId',
        element: <AssetContextPage />,
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
