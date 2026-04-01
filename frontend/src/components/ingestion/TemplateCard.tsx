import { Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { DataSourceTemplate, DataSourceStatus, HealthStatus } from '@/types/ingestion';

interface TemplateCardProps {
  template: DataSourceTemplate;
  status?: DataSourceStatus;  // DI-06: 健康状态
  onEdit: (template: DataSourceTemplate) => void;
  onDelete: (templateId: string) => void;
}

// 状态图标映射
const statusIconMap: Record<HealthStatus, React.ReactNode> = {
  online: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
  offline: <XCircle className="w-4 h-4 text-red-500" />,
};

// 状态标签映射
const statusLabelMap: Record<HealthStatus, string> = {
  online: '在线',
  warning: '警告',
  offline: '离线',
};

export function TemplateCard({ template, status, onEdit, onDelete }: TemplateCardProps) {
  const lastSyncDisplay = status?.last_sync
    ? new Date(status.last_sync).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-700 hover:border-accent transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-accent">
          {/* 设备类型图标占位 */}
          <span className="text-lg font-bold">{template.device_type.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h3 className="font-medium text-slate-200">{template.name}</h3>
          <p className="text-sm text-slate-500">{template.device_type}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* DI-06: 健康状态显示 */}
        {status && (
          <div className="flex items-center gap-2 mr-2">
            {statusIconMap[status.status]}
            <span className={`text-sm ${
              status.status === 'online' ? 'text-emerald-500' :
              status.status === 'warning' ? 'text-amber-500' :
              'text-red-500'
            }`}>
              {statusLabelMap[status.status]}
            </span>
          </div>
        )}
        {/* 使用 text badge 代替 severity badge */}
        <span className="px-2 py-0.5 rounded text-xs font-medium border border-slate-600 text-slate-300">
          {template.log_format}
        </span>
        {/* DI-06: 最后同步时间 */}
        {lastSyncDisplay && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <RefreshCw className="w-3 h-3" />
            <span>{lastSyncDisplay}</span>
          </div>
        )}
        <button
          onClick={() => onEdit(template)}
          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-accent transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
