/**
 * 准确率徽章组件 (DI-09)
 *
 * 根据准确率显示不同颜色的徽章
 * - qualified (>85%): 绿色
 * - warning (70-85%): 黄色
 * - failed (<70%): 红色
 */

import { Badge } from '@/components/ui/badge';

interface AccuracyBadgeProps {
  accuracy: number; // 0-100 或 0-1
  showLabel?: boolean;
}

export function AccuracyBadge({ accuracy, showLabel = true }: AccuracyBadgeProps) {
  // 转换为 0-100 范围
  const percent = accuracy > 1 ? accuracy : accuracy * 100;

  // 根据准确率确定状态
  const getStatus = () => {
    if (percent >= 85) return 'qualified';
    if (percent >= 70) return 'warning';
    return 'failed';
  };

  const status = getStatus();

  // 样式配置
  const styles = {
    qualified: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      label: '达标'
    },
    warning: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      label: '警告'
    },
    failed: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
      label: '未达标'
    }
  };

  const style = styles[status];

  return (
    <Badge
      variant="outline"
      className={`${style.bg} ${style.text} ${style.border} px-3 py-1.5 text-sm font-medium`}
    >
      <span className="font-mono">{percent.toFixed(1)}%</span>
      {showLabel && (
        <span className="ml-1.5 text-xs opacity-80">{style.label}</span>
      )}
    </Badge>
  );
}
