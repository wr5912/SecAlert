/**
 * 告警详情页面
 * 展示完整的攻击链时间线和处置建议
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ChainTimeline } from '../components/ChainTimeline';
import { RemediationPanel } from '../components/RemediationPanel';
import { fetchRemediation } from '../lib/api';
import type { Severity } from '../types';
import { useChatStore } from '../stores/chatStore';

export function AlertDetailPage() {
  const { chainId } = useParams<{ chainId: string }>();
  const setContext = useChatStore(state => state.setContext);

  // 设置聊天上下文为攻击链视图
  useEffect(() => {
    if (chainId) {
      setContext({ type: 'chain', chain_id: chainId });
    }
  }, [chainId, setContext]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chain', chainId],
    queryFn: () => fetchRemediation(chainId!),
    enabled: !!chainId,
  });

  if (!chainId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">缺少告警 ID</p>
        <Link to="/alerts" className="text-blue-500 hover:underline mt-2 inline-block">
          返回告警列表
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">加载失败: {error?.message || '未知错误'}</p>
        <Link to="/alerts" className="text-blue-500 hover:underline mt-2 inline-block">
          返回告警列表
        </Link>
      </div>
    );
  }

  const { recommendation, timeline, severity, status, asset_ip, src_ip } = data;

  // 将 severity 转换为显示字符串
  const severityText = typeof severity === 'number'
    ? ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][severity] || 'UNKNOWN'
    : severity?.toUpperCase();

  return (
    <div className="space-y-6">
      {/* 返回链接 */}
      <Link
        to="/alerts"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        返回告警列表
      </Link>

      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Badge severity={severity as Severity}>
          {severityText}
        </Badge>
        <span className="text-slate-600 font-mono text-sm">{chainId}</span>
        <span className="text-sm text-slate-500">
          状态: {status === 'active' ? '活跃' : status === 'resolved' ? '已解决' : '误报'}
        </span>
      </div>

      {/* 主要内容 - 响应式 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 告警详情和时间线 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>告警详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">源 IP:</span>
                  <span className="ml-2 font-mono">{src_ip || '未知'}</span>
                </div>
                <div>
                  <span className="text-slate-500">目标资产:</span>
                  <span className="ml-2 font-mono">{asset_ip || '未知'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 攻击链时间线 */}
          <Card>
            <CardHeader>
              <CardTitle>攻击链时间线</CardTitle>
            </CardHeader>
            <CardContent>
              <ChainTimeline timeline={timeline} />
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 处置建议 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>处置建议</CardTitle>
            </CardHeader>
            <CardContent>
              <RemediationPanel recommendation={recommendation} />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card className="mt-4">
            <CardContent className="p-4 space-y-3">
              <Button variant="default" className="w-full">
                确认已通报
              </Button>
              <Button variant="destructive" className="w-full">
                确认为误报
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}