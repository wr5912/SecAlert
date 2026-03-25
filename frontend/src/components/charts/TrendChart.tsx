/**
 * 告警趋势图组件
 *
 * 使用 Recharts 渲染告警趋势折线图
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
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#8884d8"
          name="总告警"
        />
        <Line
          type="monotone"
          dataKey="truePositives"
          stroke="#82ca9d"
          name="真威胁"
        />
        <Line
          type="monotone"
          dataKey="falsePositives"
          stroke="#ffc658"
          name="误报"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
