/**
 * 顶部导航栏组件 - 深色专业主题
 */

import { Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';

const navItems = [
  { path: '/', label: '仪表盘' },
  { path: '/alerts', label: '告警列表' },
  { path: '/analysis', label: '分析工作台' },
  { path: '/settings', label: '设置' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Shield className="w-7 h-7 text-cyan-400" />
          <h1 className="text-lg font-semibold text-cyan-400">SecAlert</h1>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-cyan-400/10 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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