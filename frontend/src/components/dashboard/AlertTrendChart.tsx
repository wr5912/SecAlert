/**
 * 告警趋势折线图
 * 使用 Recharts 展示时间序列数据 - Tactical Command Center 风格
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AlertTrendChartProps {
  data: { time: string; count: number }[];
}

export function AlertTrendChart({ data }: AlertTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="time"
          stroke="#64748b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <YAxis
          stroke="#64748b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#e2e8f0'
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#00f0ff"
          strokeWidth={2}
          dot={{ fill: '#00f0ff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#00f0ff', stroke: '#00f0ff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}