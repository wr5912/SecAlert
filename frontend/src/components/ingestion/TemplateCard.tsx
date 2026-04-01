import { Pencil, Trash2, RefreshCw, AlertCircle, Server, Database, Globe, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DataSourceTemplate, HealthStatus } from '@/types/ingestion';
import { useTemplateStatus } from '@/api/ingestionEndpoints';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

// 设备类型图标映射
const deviceIconMap: Record<string, React.ReactNode> = {
  firewall: <Shield className="w-5 h-5" />,
  ids: <AlertCircle className="w-5 h-5" />,
  vpn: <Server className="w-5 h-5" />,
  switch: <Globe className="w-5 h-5" />,
  router: <Globe className="w-5 h-5" />,
  waf: <Shield className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
};

// 状态配置
const statusConfig: Record<HealthStatus, { label: string; icon: React.ReactNode; color: string }> = {
  online: { label: '在线', icon: <CheckCircle className="w-4 h-4" />, color: 'text-success' },
  warning: { label: '警告', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-warning' },
  offline: { label: '离线', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
};

interface TemplateCardProps {
  template: DataSourceTemplate;
  onEdit: (template: DataSourceTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  // DI-06: 使用真实 API 获取状态
  const { data: status } = useTemplateStatus(template.id);

  const lastSyncDisplay = status?.last_sync
    ? new Date(status.last_sync).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const deviceIcon = deviceIconMap[template.device_type.toLowerCase()] || <Server className="w-5 h-5" />;
  const statusInfo = status ? statusConfig[status.status] : null;

  return (
    <div className={cn(
      "group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
      "bg-surface hover:bg-surface-hover border-border hover:border-accent/40"
    )}>
      {/* 左侧: 设备图标和信息 */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
          "bg-accent/10 border border-accent/20 text-accent",
          "group-hover:bg-accent/15 group-hover:border-accent/30"
        )}>
          {deviceIcon}
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
            {template.name}
          </h3>
          <p className="text-sm text-text-muted capitalize">{template.device_type}</p>
        </div>
      </div>

      {/* 右侧: 状态、标签和操作 */}
      <div className="flex items-center gap-4">
        {statusInfo && (
          <div className={cn("flex items-center gap-2 mr-2", statusInfo.color)}>
            {statusInfo.icon}
            <span className="text-sm font-medium">{statusInfo.label}</span>
          </div>
        )}

        {/* 日志格式 */}
        <span className="px-2 py-0.5 rounded text-xs font-medium border border-border text-text-secondary">
          {template.log_format}
        </span>

        {lastSyncDisplay && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <RefreshCw className="w-3 h-3" />
            <span>{lastSyncDisplay}</span>
          </div>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(template)} className="text-text-muted hover:text-accent">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onDelete(template.id)} className="text-text-muted hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
