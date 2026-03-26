/**
 * 故事线卡片组件
 * 显示单个告警故事线的聚合信息
 */

import { useNavigate } from 'react-router-dom';
import type { Storyline } from '../../types/analysis';

// 故事线卡片属性
export interface StorylineCardProps {
  storyline: Storyline;
  selected?: boolean;
  onSelect?: (storyId: string) => void;
}

// 置信度颜色映射
const confidenceColors = {
  high: 'text-red-500',      // >80
  medium: 'text-orange-500', // 50-80
  low: 'text-gray-400',       // <50
};

// 获取置信度等级
function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence > 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

// 故事线卡片组件
export function StorylineCard({ storyline, selected = false, onSelect }: StorylineCardProps) {
  const navigate = useNavigate();
  const confidenceLevel = getConfidenceLevel(storyline.confidence);

  const handleClick = () => {
    onSelect?.(storyline.id);
    navigate(`/graph/${storyline.id}`);
  };

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
      onClick={handleClick}
    >
      {/* 置信度标签 */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-semibold ${confidenceColors[confidenceLevel]}`}>
          {storyline.confidence}%
        </span>
        <span className="text-xs text-slate-400">
          {storyline.attackPhase}
        </span>
      </div>

      {/* AI 摘要 */}
      <p className="text-sm text-slate-300 mb-3 line-clamp-2">
        {storyline.summary}
      </p>

      {/* 关键指标 */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{storyline.assetCount} 资产</span>
        <span>{storyline.alerts.length} 告警</span>
        {storyline.threatIntelMatch > 0 && (
          <span className="text-amber-500">威胁情报匹配 {storyline.threatIntelMatch}%</span>
        )}
      </div>
    </div>
  );
}

export default StorylineCard;
