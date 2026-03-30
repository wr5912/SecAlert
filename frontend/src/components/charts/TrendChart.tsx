/**
 * 告警趋势图组件
 * 使用 Recharts 渲染告警趋势折线图 - Tactical Command Center 风格
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TrendData {
  date: string;
  total: number;
  truePositives: number;
  falsePositives: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorTrue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ff2d55" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorFalse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4b5563" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#4b5563" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#e2e8f0'
          }}
        />
        <Legend
          wrapperStyle={{ color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#00f0ff"
          name="总告警"
          strokeWidth={2}
          dot={{ fill: '#00f0ff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#00f0ff' }}
        />
        <Line
          type="monotone"
          dataKey="truePositives"
          stroke="#ff2d55"
          name="真威胁"
          strokeWidth={2}
          dot={{ fill: '#ff2d55', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#ff2d55' }}
        />
        <Line
          type="monotone"
          dataKey="falsePositives"
          stroke="#4b5563"
          name="误报"
          strokeWidth={2}
          dot={{ fill: '#4b5563', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#4b5563' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
