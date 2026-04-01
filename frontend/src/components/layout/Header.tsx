/**
 * 顶部导航栏组件 - Tactical Command Center 风格
 */

import { Shield, Bot, Bell, User, LayoutDashboard, AlertTriangle, Database, Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAnalysisStore } from '../../stores/analysisStore';
import { Button } from '../ui/button';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/alerts', label: '告警列表', icon: AlertTriangle },
  { path: '/ingestion', label: '数据接入', icon: Database },
  { path: '/analysis', label: '分析工作台', icon: Search },
  { path: '/settings', label: '设置', icon: Settings },
];

export function Header() {
  const location = useLocation();
  const copilotOpen = useAnalysisStore((state) => state.copilotOpen);
  const toggleCopilot = useAnalysisStore((state) => state.toggleCopilot);

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border/50 relative z-50">
      {/* 顶部 accent 微光 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="flex items-center justify-between h-full px-6">
        {/* Logo 区域 */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-xl flex items-center justify-center group-hover:border-accent/50 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all duration-200">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-text-primary tracking-tight">SecAlert</span>
            <p className="text-[10px] text-text-muted -mt-0.5">智能安全分析</p>
          </div>
        </Link>

        {/* 导航区域 */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                  isActive
                    ? 'text-accent bg-accent/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                <span className="inline-flex items-center mr-1.5">
                  <Icon className="w-4 h-4" />
                </span>
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-accent rounded-full shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 右侧操作区域 */}
        <div className="flex items-center gap-3">
          {/* 通知按钮 */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {/* 通知徽章 */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          {/* AI Copilot 按钮 */}
          <Button
            variant={copilotOpen ? "default" : "outline"}
            size="sm"
            onClick={toggleCopilot}
            className={cn(
              "gap-2",
              copilotOpen && "shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            )}
          >
            <Bot className="w-4 h-4" />
            <span>AI Copilot</span>
          </Button>

          {/* 用户头像 */}
          <div className="w-9 h-9 bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/20 rounded-full flex items-center justify-center cursor-pointer hover:border-accent/40 transition-colors">
            <User className="w-4 h-4 text-accent" />
          </div>
        </div>
      </div>
    </header>
  );
}