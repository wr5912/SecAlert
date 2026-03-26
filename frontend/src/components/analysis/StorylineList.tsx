/**
 * 故事线列表组件
 * 左侧聚类面板 + 中央详情区布局，显示筛选后的告警故事线
 */

import { useState, useEffect } from 'react';
import { StorylineCard } from './StorylineCard';
import { useAnalysisStore } from '../../stores/analysisStore';
import { fetchStorylines } from '../../api/analysisEndpoints';
import type { Storyline, StorylineFilters } from '../../types/analysis';

// 故事线列表组件属性
export interface StorylineListProps {
  onSelectStoryline?: (storylineId: string) => void;
}

export function StorylineList({ onSelectStoryline }: StorylineListProps) {
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从 store 获取筛选条件
  const filters = useAnalysisStore((state) => state.filters);
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

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">错误: {error}</div>
      </div>
    );
  }

  // 空状态
  if (storylines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p>暂无告警</p>
        <p className="text-sm mt-1">尝试调整筛选条件</p>
      </div>
    );
  }

  return (
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
  );
}

export default StorylineList;
