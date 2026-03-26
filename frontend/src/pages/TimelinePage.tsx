/**
 * 时间线页面
 * 路由: /analysis/timeline
 * 多轨道事件时间线，跨网络/端点/身份/应用层
 */

import { useState, useEffect } from 'react';
import { Timeline } from '../components/analysis/Timeline';
import { fetchTimeline } from '../api/analysisEndpoints';
import type { TimelineEvent, TimeRange } from '../types/analysis';

// 数据源选项
const sourceOptions = [
  { value: 'firewall', label: '防火墙' },
  { value: 'ids', label: 'IDS' },
  { value: 'edr', label: 'EDR' },
  { value: 'waf', label: 'WAF' },
  { value: 'proxy', label: '代理' },
  { value: 'dns', label: 'DNS' },
];

// 事件类型选项
const eventTypeOptions = [
  { value: 'connection', label: '连接' },
  { value: 'authentication', label: '认证' },
  { value: 'file_access', label: '文件访问' },
  { value: 'process', label: '进程' },
  { value: 'registry', label: '注册表' },
  { value: 'network', label: '网络' },
];

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(50);

  // 设置默认时间范围（最近24小时）
  useEffect(() => {
    if (!timeRange) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setTimeRange({
        start: yesterday.toISOString(),
        end: now.toISOString(),
      });
    }
  }, [timeRange]);

  // 加载时间线数据
  useEffect(() => {
    async function loadTimeline() {
      if (!timeRange) return;
      setLoading(true);
      try {
        const data = await fetchTimeline(timeRange, selectedSources.length > 0 ? selectedSources : undefined);
        // 客户端过滤事件类型
        const filtered = selectedEventTypes.length > 0
          ? data.filter((e) => selectedEventTypes.includes(e.eventType))
          : data;
        setEvents(filtered);
      } catch (error) {
        console.error('[TimelinePage] Failed to load timeline:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTimeline();
  }, [timeRange, selectedSources, selectedEventTypes]);

  // 处理数据源切换
  const handleSourceToggle = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  // 处理事件类型切换
  const handleEventTypeToggle = (eventType: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  };

  // 处理播放位置变化 (D-06)
  const handlePlaybackChange = (position: number) => {
    setPlaybackPosition(position);
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      const currentTime = startTime + (endTime - startTime) * (position / 100);
      console.log('[TimelinePage] Playback at:', new Date(currentTime).toISOString());
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部筛选栏 */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-b border-slate-700 bg-slate-800/30">
        {/* 时间范围 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">时间:</span>
          <input
            type="datetime-local"
            value={timeRange?.start ? timeRange.start.slice(0, 16) : ''}
            onChange={(e) => {
              const newStart = e.target.value ? new Date(e.target.value).toISOString() : '';
              setTimeRange((prev) => ({ start: newStart, end: prev?.end || '' }));
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          />
          <span className="text-slate-500">-</span>
          <input
            type="datetime-local"
            value={timeRange?.end ? timeRange.end.slice(0, 16) : ''}
            onChange={(e) => {
              const newEnd = e.target.value ? new Date(e.target.value).toISOString() : '';
              setTimeRange((prev) => ({ start: prev?.start || '', end: newEnd }));
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          />
        </div>

        {/* 数据源筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">来源:</span>
          <div className="flex gap-1">
            {sourceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSourceToggle(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSources.includes(opt.value)
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 事件类型筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">类型:</span>
          <select
            onChange={(e) => {
              if (e.target.value) handleEventTypeToggle(e.target.value);
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          >
            <option value="">全部</option>
            {eventTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 时间线内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-slate-400">加载中...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p>暂无事件数据</p>
            <p className="text-sm mt-1">尝试调整筛选条件</p>
          </div>
        ) : (
          <Timeline events={events} collapsed={false} />
        )}
      </div>

      {/* 底部范围滑块时间轴控制器 (D-06) */}
      <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-xs text-slate-400">回放:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={playbackPosition}
            onChange={(e) => handlePlaybackChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-slate-400 w-12 text-right">
            {playbackPosition}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>拖拽时间轴回放攻击演进</span>
          <span>当前位置: {timeRange ? new Date(
            new Date(timeRange.start).getTime() +
            (new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()) * (playbackPosition / 100)
          ).toLocaleString() : '-'}</span>
        </div>
      </div>
    </div>
  );
}
