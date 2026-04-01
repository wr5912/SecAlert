/**
 * 数据接入页面
 * 整合向导模态框和模板列表管理
 */

import { useState } from 'react';
import { useTemplates, useDeleteTemplate } from '@/api/ingestionEndpoints';
import { useIngestionStore } from '@/stores/ingestionStore';
import { TemplateCard } from '@/components/ingestion/TemplateCard';
import { TemplateEmptyState } from '@/components/ingestion/TemplateEmptyState';
import { WizardModal } from '@/components/ingestion/wizard/WizardModal';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="p-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">数据接入</h1>
          <p className="text-sm text-slate-400 mt-1">管理安全设备的日志接入</p>
        </div>
        <Button onClick={openWizard}>
          新建模板
        </Button>
      </div>

      {/* 加载状态 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : templates.length === 0 ? (
        /* 空状态 */
        <TemplateEmptyState onCreateClick={openWizard} />
      ) : (
        /* 模板列表 */
        <div className="grid gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              status={getTemplateStatus(template.id)}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* 新建向导模态框 */}
      <WizardModal open={isWizardOpen} onOpenChange={closeWizard} />

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
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
