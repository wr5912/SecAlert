/**
 * 分析模块导航侧边栏
 * 左侧导航菜单，支持折叠展开
 */

import { NavLink } from 'react-router-dom';
import {
  AlertCircle,
  Search,
  Clock,
  Server,
} from 'lucide-react';

// 导航项配置
const navItems = [
  { path: '/analysis/alerts', icon: AlertCircle, label: '告警中心' },
  { path: '/analysis/hunting', icon: Search, label: '威胁狩猎' },
  { path: '/analysis/timeline', icon: Clock, label: '溯源时间线' },
  { path: '/analysis/assets', icon: Server, label: '资产图谱' },
];

// NavSidebar 属性
export interface NavSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function NavSidebar({ collapsed = false, onToggle }: NavSidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-50'
      }`}
    >
      {/* Logo 区域 */}
      <div className="flex items-center justify-end h-16 px-4 border-b border-slate-700">
        <button
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* 导航列表 */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-400/10 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部信息 */}
      {!collapsed && (
        <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-700">
          分析工作台 v1.1
        </div>
      )}
    </aside>
  );
}

export default NavSidebar;
