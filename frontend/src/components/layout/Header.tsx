/**
 * 顶部导航栏组件
 */

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