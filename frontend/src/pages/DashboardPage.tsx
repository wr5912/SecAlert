/**
 * 仪表盘页面
 * 展示统计数据、趋势图表和严重度分布
 */

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { AlertTrendChart } from '../components/dashboard/AlertTrendChart';
import { SeverityPieChart } from '../components/dashboard/SeverityPieChart';
import { fetchMetrics, type DashboardMetrics } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">加载失败: {error?.message || '未知错误'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总告警数"
          value={data.total}
          icon={AlertCircle}
          trend="neutral"
        />
        <StatCard
          title="真威胁"
          value={data.truePositives}
          icon={XCircle}
          trend="up"
          change={12}
          changeLabel="较上周"
        />
        <StatCard
          title="误报率"
          value={`${data.falsePositiveRate}%`}
          icon={CheckCircle}
          trend="down"
          change={-5}
          changeLabel="较上周"
        />
        <StatCard
          title="处置率"
          value={`${data.resolutionRate}%`}
          icon={Activity}
          trend="up"
          change={8}
          changeLabel="较上周"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 告警趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>告警趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTrendChart data={data.trends} />
          </CardContent>
        </Card>

        {/* 严重度分布 */}
        <Card>
          <CardHeader>
            <CardTitle>严重度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityPieChart data={data.bySeverity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}