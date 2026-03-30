/**
 * 分析工作台布局组件
 * 顶部 Header + 左侧 NavSidebar (200px/64px) + 中央 Canvas (flex-1) + 右侧 AIPanel (320px)
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../layout/Header';
import { NavSidebar } from './NavSidebar';
import { AIPanel } from './AIPanel';

export function AnalysisShell() {
  const [navCollapsed, setNavCollapsed] = useState(false);

  const toggleNav = () => setNavCollapsed((prev) => !prev);

  return (
    <div className="flex flex-col h-screen bg-[#0f172a]">
      {/* 顶部导航栏 */}
      <Header />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 200px 展开 / 64px 折叠 */}
        <NavSidebar collapsed={navCollapsed} onToggle={toggleNav} />

        {/* 中央画布 flex-1 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* 右侧 AI Copilot 320px */}
        <AIPanel />
      </div>
    </div>
  );
}
