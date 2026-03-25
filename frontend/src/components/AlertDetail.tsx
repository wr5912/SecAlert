/** 告警详情单屏组件

Per D-07: 单屏设计 - 攻击链摘要 + 处置建议 + 操作按钮
Per D-08: 响应工作流 - "确认已通报"和"确认为误报"+可选备注
*/

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { ChainTimeline } from './ChainTimeline';
import { RemediationPanel } from './RemediationPanel';
import type { RemediationResponse, Severity } from '../types';
import { fetchRemediation, acknowledgeAlert, restoreAlert } from '../api/client';

interface AlertDetailProps {
  chainId: string;
  onBack: () => void;
  onStatusChange: () => void;
}

export function AlertDetail({ chainId, onBack, onStatusChange }: AlertDetailProps) {
  const [data, setData] = useState<RemediationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // 加载处置建议
  useEffect(() => {
    loadRemediation();
  }, [chainId]);

  async function loadRemediation() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchRemediation(chainId);
      setData(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 确认已通报
  async function handleAcknowledge() {
    setConfirming(true);
    try {
      await acknowledgeAlert(chainId, note || undefined);
      onStatusChange();
      onBack();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setConfirming(false);
    }
  }

  // 确认为误报（显示确认弹窗）
  async function handleRestore() {
    setConfirmDialogOpen(false);
    setConfirming(true);
    try {
      await restoreAlert(chainId);
      onStatusChange();
      onBack();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error || '加载失败'}</p>
        <Button onClick={loadRemediation}>重试</Button>
      </div>
    );
  }

  const { recommendation, timeline, severity } = data;

  // 将 severity 转换为显示字符串
  const severityText = typeof severity === 'number'
    ? ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][severity] || 'UNKNOWN'
    : severity?.toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Badge severity={severity as Severity}>
          {severityText}
        </Badge>
        <span className="text-slate-600 font-mono text-sm">{chainId}</span>
      </div>

      {/* Chain Timeline */}
      <Card>
        <CardContent className="p-4">
          <ChainTimeline timeline={timeline} />
        </CardContent>
      </Card>

      {/* Remediation Panel */}
      <Card>
        <CardContent className="p-4">
          <RemediationPanel recommendation={recommendation} />
        </CardContent>
      </Card>

      {/* 操作区域 */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* 备注输入 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              备注（可选）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加处理备注..."
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm resize-none"
              rows={2}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleAcknowledge}
              disabled={confirming}
            >
              {confirming ? '处理中...' : '确认已通报'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={confirming}
            >
              确认为误报
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">确认为误报</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    此操作将恢复告警至活跃状态
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRestore}
                >
                  确认
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
