/**
 * 告警中心页面
 * 路由: /analysis/alerts
 * AI 驱动的告警故事线聚合，支持多维度筛选
 */

import { useState, useEffect } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { StorylineList } from '../components/analysis/StorylineList';
import { ContextPanel } from '../components/analysis/ContextPanel';
import type { Severity } from '../types/analysis';

// 严重级别选项
const severityOptions: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
];

// 数据源选项
const sourceOptions = [
  { value: 'firewall', label: '防火墙' },
  { value: 'ids', label: 'IDS' },
  { value: 'edr', label: 'EDR' },
  { value: 'waf', label: 'WAF' },
  { value: 'cloud', label: '云安全' },
];

export function AlertCenterPage() {
  // 从 store 获取筛选条件
  const filters = useAnalysisStore((state) => state.filters);
  const updateFilters = useAnalysisStore((state) => state.updateFilters);
  const selectedStorylineId = useAnalysisStore((state) => state.selectedStorylineId);
  const selectedEntityId = useAnalysisStore((state) => state.selectedEntityId);

  // 本地状态用于时间范围
  const [timeRange, setTimeRange] = useState<{ start: string; end: string } | null>(null);

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

  // 处理严重级别切换
  const handleSeverityChange = (severity: Severity) => {
    const current = filters.severities || [];
    const newSeverities = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    updateFilters({ severities: newSeverities });
  };

  // 处理数据源切换
  const handleSourceChange = (source: string) => {
    const current = filters.sources || [];
    const newSources = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    updateFilters({ sources: newSources });
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
              if (timeRange?.end) {
                updateFilters({ timeRange: { start: newStart, end: timeRange.end } });
              }
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
              if (timeRange?.start) {
                updateFilters({ timeRange: { start: timeRange.start, end: newEnd } });
              }
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          />
        </div>

        {/* 严重级别 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">严重:</span>
          <div className="flex gap-1">
            {severityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSeverityChange(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.severities?.includes(opt.value)
                    ? `${opt.color} text-white`
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 数据源 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">来源:</span>
          <select
            onChange={(e) => {
              if (e.target.value) handleSourceChange(e.target.value);
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          >
            <option value="">全部</option>
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 置信度筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">置信度:</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="最低"
            value={filters.confidenceRange?.min ?? ''}
            onChange={(e) =>
              updateFilters({
                confidenceRange: {
                  min: parseInt(e.target.value) || 0,
                  max: filters.confidenceRange?.max ?? 100,
                },
              })
            }
            className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          />
          <span className="text-slate-500">-</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="最高"
            value={filters.confidenceRange?.max ?? ''}
            onChange={(e) =>
              updateFilters({
                confidenceRange: {
                  min: filters.confidenceRange?.min ?? 0,
                  max: parseInt(e.target.value) || 100,
                },
              })
            }
            className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          />
        </div>
      </div>

      {/* 主内容区: 左侧故事线列表 + 右侧上下文面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧故事线聚类面板 */}
        <div className="flex-1 overflow-y-auto border-r border-slate-700">
          <StorylineList />
        </div>

        {/* 右侧上下文面板 */}
        <div className="w-80 flex-shrink-0">
          <ContextPanel assetId={selectedEntityId || undefined} />
        </div>
      </div>
    </div>
  );
}
