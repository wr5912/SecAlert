/** 简化攻击链时间线组件

Per D-05: 简化线性时间线
显示 4 个关键节点：攻击源 → 主要行为 → 受影响资产 → 攻击阶段
*/

import React from 'react';
import { Search, AlertTriangle, Target, MapPin } from 'lucide-react';
import type { Timeline, TimelineNode } from '../types';

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-5 h-5" />,
  alert: <AlertTriangle className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  'map-pin': <MapPin className="w-5 h-5" />,
};

// 节点颜色
const nodeColors: Record<string, string> = {
  source: 'bg-slate-100 text-slate-700 border-slate-300',
  behavior: 'bg-orange-50 text-orange-700 border-orange-200',
  target: 'bg-red-50 text-red-700 border-red-200',
  phase: 'bg-blue-50 text-blue-700 border-blue-200',
};

interface ChainTimelineProps {
  timeline: Timeline;
}

export function ChainTimeline({ timeline }: ChainTimelineProps) {
  const { nodes, summary } = timeline;

  return (
    <div className="space-y-3">
      {/* 节点水平排列 */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {nodes.map((node, index) => (
          <React.Fragment key={node.type}>
            <TimelineNodeComponent node={node} />
            {index < nodes.length - 1 && (
              <span className="text-slate-400 flex-shrink-0">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 摘要文字 */}
      {summary && (
        <p className="text-sm text-slate-600">{summary}</p>
      )}
    </div>
  );
}

function TimelineNodeComponent({ node }: { node: TimelineNode }) {
  const icon = iconMap[node.icon] || <AlertTriangle className="w-5 h-5" />;
  const colorClass = nodeColors[node.type] || 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass} flex-shrink-0`}>
      {icon}
      <span className="text-sm font-medium whitespace-nowrap">{node.label}</span>
    </div>
  );
}
