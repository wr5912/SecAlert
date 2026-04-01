/**
 * 数据接入页面
 * 整合向导模态框和模板列表管理
 */

import { useState } from 'react';
import { Plus, Database, Upload } from 'lucide-react';
import { useTemplates, useDeleteTemplate } from '@/api/ingestionEndpoints';
import { useIngestionStore } from '@/stores/ingestionStore';
import { TemplateCard } from '@/components/ingestion/TemplateCard';
import { TemplateEmptyState } from '@/components/ingestion/TemplateEmptyState';
import { WizardModal } from '@/components/ingestion/wizard/WizardModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { DataSourceTemplate, DataSourceStatus, HealthStatus } from '@/types/ingestion';

// 模拟状态数据（实际应从 API 获取）- DI-06
const mockStatuses: Record<string, DataSourceStatus> = {};

export function IngestionPage() {
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { isWizardOpen, openWizard, closeWizard } = useIngestionStore();

  const [deleteTarget, setDeleteTarget] = useState<DataSourceTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 获取模板状态 - DI-06（实际应从 API 获取）
  const getTemplateStatus = (templateId: string): DataSourceStatus | undefined => {
    // 模拟数据：随机分配状态用于演示
    if (!mockStatuses[templateId]) {
      const statuses: HealthStatus[] = ['online', 'warning', 'offline'];
      mockStatuses[templateId] = {
        template_id: templateId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        last_sync: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        events_received: Math.floor(Math.random() * 1000),
      };
    }
    return mockStatuses[templateId];
  };

  const handleEdit = (template: DataSourceTemplate) => {
    // TODO: 实现编辑功能
    console.log('编辑模板:', template.name);
  };

  const handleDeleteClick = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setDeleteTarget(template);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteTemplate.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 计算统计数据
  const onlineCount = templates.filter(t => {
    const status = getTemplateStatus(t.id);
    return status?.status === 'online';
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">数据接入</h1>
            <p className="text-sm text-text-muted mt-0.5">管理安全设备的日志接入</p>
          </div>
        </div>

        <Button onClick={openWizard} size="lg" className="gap-2">
          <Plus className="w-4 h-4" />
          新建模板
        </Button>
      </div>

      {/* 统计概览 */}
      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-surface/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{templates.length}</p>
                  <p className="text-xs text-text-muted">数据源模板</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-bg flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{onlineCount}</p>
                  <p className="text-xs text-text-muted">在线数据源</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {templates.reduce((sum, t) => {
                      const status = getTemplateStatus(t.id);
                      return sum + (status?.events_received || 0);
                    }, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">总事件数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-text-muted">加载数据源...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        /* 空状态 */
        <TemplateEmptyState onCreateClick={openWizard} />
      ) : (
        /* 模板列表 */
        <div className="space-y-3">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className="animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TemplateCard
                template={template}
                status={getTemplateStatus(template.id)}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* 新建向导模态框 */}
      <WizardModal open={isWizardOpen} onOpenChange={closeWizard} />

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>删除模板</DialogTitle>
            <DialogDescription>
              确定要删除模板「{deleteTarget?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
