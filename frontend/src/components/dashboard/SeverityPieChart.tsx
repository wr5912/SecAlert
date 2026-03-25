/**
 * 严重度分布饼图
 * 使用 Recharts 展示各严重度告警占比
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
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
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
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}