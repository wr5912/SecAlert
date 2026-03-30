/**
 * 顶部导航栏组件 - Tactical Command Center 风格
 */

import { Shield, Bot } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAnalysisStore } from '../../stores/analysisStore';

const navItems = [
  { path: '/', label: '仪表盘' },
  { path: '/alerts', label: '告警列表' },
  { path: '/analysis', label: '分析工作台' },
  { path: '/settings', label: '设置' },
];

export function Header() {
  const location = useLocation();
  const copilotOpen = useAnalysisStore((state) => state.copilotOpen);
  const toggleCopilot = useAnalysisStore((state) => state.toggleCopilot);

  return (
    <header className="h-14 bg-surface border-b border-border relative">
      {/* 底部渐变线 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="flex items-center justify-between h-full px-6">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-accent/20 border border-accent/50 rounded flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <span className="font-heading font-semibold text-lg text-slate-200 tracking-tight">SecAlert</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-3 py-2 text-sm transition-colors duration-150 relative group',
                location.pathname === item.path
                  ? 'text-accent'
                  : 'text-slate-400 hover:text-accent'
              )}
            >
              {item.label}
              {location.pathname === item.path && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-glow-accent" />
              )}
            </Link>
          ))}
        </nav>
        {/* AI Copilot 按钮 - 切换面板 */}
        <button
          onClick={toggleCopilot}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors duration-150',
            copilotOpen
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'bg-accent/10 border-accent/50 text-accent hover:bg-accent/20'
          )}
        >
          <Bot className="w-4 h-4" />
          <span className="text-sm font-medium">AI Copilot</span>
        </button>
      </div>
    </header>
  );
}