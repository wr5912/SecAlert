/**
 * 主布局组件
 * 包含 Header + Content Area，使用 React Router Outlet
 */

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AIPanel } from '../analysis/AIPanel';

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <Header />
      <main className="flex-1 flex">
        <div className="flex-1 px-6 py-6">
          <Outlet />
        </div>
        {/* 右侧 AI Copilot 面板 */}
        <AIPanel />
      </main>
    </div>
  );
}
