/**
 * 主布局组件
 * 包含 Header + Content Area，使用 React Router Outlet
 */

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