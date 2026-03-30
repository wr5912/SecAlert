/**
 * 严重度分布饼图
 * 使用 Recharts 展示各严重度告警占比 - Tactical Command Center 风格
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { Severity } from '../../types';

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#fbbf24',
  low: '#4b5563',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
};

interface SeverityPieChartProps {
  data: { severity: Severity; count: number }[];
}

export function SeverityPieChart({ data }: SeverityPieChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: SEVERITY_LABELS[item.severity],
    color: SEVERITY_COLORS[item.severity],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="count"
          stroke="#0a0f1a"
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
          }}
          itemStyle={{
            color: '#e2e8f0',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-sm text-slate-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}