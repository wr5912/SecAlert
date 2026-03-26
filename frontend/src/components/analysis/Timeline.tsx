/**
 * 多轨道时间线组件
 * 显示网络、端点、身份、应用四个轨道的事件时间线
 */

import { useState } from 'react';
import type { TimelineEvent, TimelineLayer } from '../../types/analysis';

// 轨道配置
const layerConfig: Record<TimelineLayer, { label: string; color: string }> = {
  network: { label: '网络', color: '#06b6d4' },
  endpoint: { label: '端点', color: '#8b5cf6' },
  identity: { label: '身份', color: '#f59e0b' },
  application: { label: '应用', color: '#22c55e' },
};

// 时间线组件属性
export interface TimelineProps {
  events: TimelineEvent[];
  collapsed?: boolean;
  onEventClick?: (eventId: string) => void;
}

// 轨道组件
interface TrackProps {
  layer: TimelineLayer;
  events: TimelineEvent[];
  expanded: boolean;
  onToggle: () => void;
  onEventClick?: (eventId: string) => void;
}

function Track({ layer, events, expanded, onToggle, onEventClick }: TrackProps) {
  const config = layerConfig[layer];

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* 轨道头部 */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-800/50"
        style={{ borderLeftColor: config.color, borderLeftWidth: '3px' }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200">{config.label}</span>
          <span className="text-xs text-slate-500">({events.length} 事件)</span>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* 轨道内容 */}
      {expanded && (
        <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onClick={onEventClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// 事件卡片组件
interface EventCardProps {
  event: TimelineEvent;
  onClick?: (eventId: string) => void;
}

function EventCard({ event, onClick }: EventCardProps) {
  const isAnomaly = event.isAnomaly;

  return (
    <div
      className={`p-3 rounded border text-sm cursor-pointer transition-colors ${
        isAnomaly
          ? 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20'
          : 'border-slate-700 bg-slate-800/30 hover:bg-slate-700/50'
      }`}
      onClick={() => onClick?.(event.id)}
    >
      {/* 时间戳 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">
          {new Date(event.timestamp).toLocaleString()}
        </span>
        {isAnomaly && (
          <span className="text-xs text-amber-500 font-medium">AI 异常</span>
        )}
      </div>

      {/* 事件类型 */}
      <div className="font-medium text-slate-200 mb-1">
        {event.eventType}
      </div>

      {/* 数据源 */}
      <div className="text-xs text-slate-400 mb-2">
        来源: {event.source}
      </div>

      {/* 原始日志 */}
      {event.rawLog && (
        <div className="text-xs text-slate-500 font-mono truncate">
          {event.rawLog}
        </div>
      )}

      {/* 关联实体 */}
      {event.entities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.entities.map((entity, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-xs bg-slate-700 rounded text-slate-300"
            >
              {entity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 多轨道时间线组件
export function Timeline({ events, collapsed = false, onEventClick }: TimelineProps) {
  // 各轨道展开/折叠状态
  const [expandedTracks, setExpandedTracks] = useState<Record<TimelineLayer, boolean>>({
    network: !collapsed,
    endpoint: !collapsed,
    identity: !collapsed,
    application: !collapsed,
  });

  // 按轨道分组事件
  const eventsByLayer = {
    network: events.filter((e) => e.layer === 'network'),
    endpoint: events.filter((e) => e.layer === 'endpoint'),
    identity: events.filter((e) => e.layer === 'identity'),
    application: events.filter((e) => e.layer === 'application'),
  };

  // 切换轨道展开/折叠
  const toggleTrack = (layer: TimelineLayer) => {
    setExpandedTracks((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="space-y-4">
      {(['network', 'endpoint', 'identity', 'application'] as TimelineLayer[]).map((layer) => (
        <Track
          key={layer}
          layer={layer}
          events={eventsByLayer[layer]}
          expanded={expandedTracks[layer]}
          onToggle={() => toggleTrack(layer)}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );
}

export default Timeline;
