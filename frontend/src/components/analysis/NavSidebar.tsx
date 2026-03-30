/**
 * 分析模块导航侧边栏
 * 左侧固定导航菜单，简洁设计
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

export function NavSidebar() {
  return (
    <aside className="flex flex-col w-48 bg-slate-900 border-r border-slate-700">
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
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default NavSidebar;
