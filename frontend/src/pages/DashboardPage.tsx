/**
 * 仪表盘页面
 * 展示统计数据、趋势图表和严重度分布
 */

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, XCircle, Activity, TrendingUp, Shield, Zap } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { AlertTrendChart } from '../components/dashboard/AlertTrendChart';
import { SeverityPieChart } from '../components/dashboard/SeverityPieChart';
import { fetchMetrics, type DashboardMetrics } from '../lib/api';
import { Card, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { GlowCard } from '../components/GlowCard';
import { CornerAccent } from '../components/CornerAccent';

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 统计卡片骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="animate-shimmer h-20 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 图表骨架屏 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-shimmer h-64 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
        <p className="text-sm text-text-muted">{error?.message || '未知错误'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">安全态势总览</h1>
          <p className="text-sm text-text-muted">实时监控网络安全状态</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总告警数"
          value={data.total.toLocaleString()}
          icon={AlertCircle}
          trend="neutral"
        />
        <StatCard
          title="真威胁"
          value={data.truePositives.toLocaleString()}
          icon={Zap}
          trend="up"
          change={12}
          changeLabel="较上周"
          severity="critical"
        />
        <StatCard
          title="误报率"
          value={`${data.falsePositiveRate}%`}
          icon={CheckCircle}
          trend="down"
          change={-5}
          changeLabel="较上周"
          severity="low"
        />
        <StatCard
          title="处置率"
          value={`${data.resolutionRate}%`}
          icon={Activity}
          trend="up"
          change={8}
          changeLabel="较上周"
          severity="high"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 告警趋势 */}
        <GlowCard>
          <CornerAccent position="tl-br">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle>告警趋势</CardTitle>
                  <CardDescription>过去 7 天的告警数量分布</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-success bg-success-bg px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  下降 12%
                </div>
              </div>
              <AlertTrendChart data={data.trends} />
            </div>
          </CornerAccent>
        </GlowCard>

        {/* 严重度分布 */}
        <GlowCard>
          <CornerAccent position="tl-br">
            <div className="p-5">
              <CardTitle>严重度分布</CardTitle>
              <CardDescription>当前告警的严重度占比</CardDescription>
              <div className="mt-4">
                <SeverityPieChart data={data.bySeverity} />
              </div>
            </div>
          </CornerAccent>
        </GlowCard>
      </div>
    </div>
  );
}