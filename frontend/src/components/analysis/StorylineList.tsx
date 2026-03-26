/**
 * 故事线列表组件
 * 左侧聚类面板 + 中央详情区布局，显示筛选后的告警故事线
 */

import { useState, useEffect } from 'react';
import { StorylineCard } from './StorylineCard';
import { useAnalysisStore } from '../../stores/analysisStore';
import { fetchStorylines } from '../../api/analysisEndpoints';
import type { Storyline, Severity } from '../../types/analysis';

// 故事线列表组件属性
export interface StorylineListProps {
  onSelectStoryline?: (storylineId: string) => void;
}

// 严重级别选项
const severityOptions: { value: Severity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ATT&CK 战术选项
const tacticOptions = [
  { value: 'reconnaissance', label: '侦察' },
  { value: 'resource_development', label: '资源开发' },
  { value: 'initial_access', label: '初始访问' },
  { value: 'execution', label: '执行' },
  { value: 'persistence', label: '持久化' },
  { value: 'privilege_escalation', label: '权限提升' },
  { value: 'defense_evasion', label: '防御规避' },
  { value: 'credential_access', label: '凭据访问' },
  { value: 'discovery', label: '发现' },
  { value: 'lateral_movement', label: '横向移动' },
  { value: 'collection', label: '收集' },
  { value: 'command_and_control', label: '命令与控制' },
  { value: 'exfiltration', label: '数据泄露' },
  { value: 'impact', label: '影响' },
];

export function StorylineList({ onSelectStoryline }: StorylineListProps) {
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从 store 获取筛选条件
  const filters = useAnalysisStore((state) => state.filters);
  const updateFilters = useAnalysisStore((state) => state.updateFilters);
  const selectedStorylineId = useAnalysisStore((state) => state.selectedStorylineId);

  // 加载故事线数据
  useEffect(() => {
    async function loadStorylines() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStorylines(filters);
        // 按置信度降序排序
        const sorted = [...data].sort((a, b) => b.confidence - a.confidence);
        setStorylines(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    loadStorylines();
  }, [filters]);

  // 处理故事线选择
  const handleSelect = (storylineId: string) => {
    useAnalysisStore.getState().selectStoryline(storylineId);
    onSelectStoryline?.(storylineId);
  };

  // 处理筛选条件变化
  const handleSeverityChange = (severity: Severity) => {
    const currentSeverities = filters.severities || [];
    const newSeverities = currentSeverities.includes(severity)
      ? currentSeverities.filter((s) => s !== severity)
      : [...currentSeverities, severity];
    updateFilters({ severities: newSeverities });
  };

  const handleTacticChange = (tactic: string) => {
    const currentTactics = filters.mitreTactics || [];
    const newTactics = currentTactics.includes(tactic)
      ? currentTactics.filter((t) => t !== tactic)
      : [...currentTactics, tactic];
    updateFilters({ mitreTactics: newTactics });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-4 p-4 border-b border-slate-700 bg-slate-800/30">
        {/* 严重级别筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">严重:</span>
          <div className="flex gap-1">
            {severityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSeverityChange(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.severities?.includes(opt.value)
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ATT&CK 战术筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">战术:</span>
          <select
            onChange={(e) => {
              if (e.target.value) handleTacticChange(e.target.value);
            }}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300"
          >
            <option value="">全部</option>
            {tacticOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 置信度范围 */}
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

      {/* 故事线列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">加载中...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400">错误: {error}</div>
          </div>
        ) : storylines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p>暂无告警</p>
            <p className="text-sm mt-1">尝试调整筛选条件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {storylines.map((storyline) => (
              <StorylineCard
                key={storyline.id}
                storyline={storyline}
                selected={storyline.id === selectedStorylineId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StorylineList;
