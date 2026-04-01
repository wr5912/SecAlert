import { CheckCircle, Server, Network, Globe, Edit3 } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { useCreateTemplate, useUpdateTemplate } from '@/api/ingestionEndpoints';
import { DEVICE_TYPES, LOG_FORMATS } from '@/types/ingestion';

interface Step4CompleteProps {
  onFinish: () => void;
}

export function Step4Complete({ onFinish }: Step4CompleteProps) {
  const {
    deviceType,
    connection,
    logFormat,
    customRegex,
    templateName,
    resetWizard,
    isEditMode,
    editingTemplate,
  } = useIngestionStore();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  // 获取设备类型标签
  const deviceTypeLabel = DEVICE_TYPES.find(d => d.id === deviceType)?.label || deviceType;

  // 获取日志格式标签
  const logFormatLabel = LOG_FORMATS.find(f => f.id === logFormat)?.label || logFormat;

  const handleFinish = async () => {
    if (!deviceType || !connection || !logFormat) return;

    if (isEditMode && editingTemplate) {
      // 编辑模式：更新模板
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        template: {
          name: templateName || editingTemplate.name,
          device_type: deviceType,
          connection,
          log_format: logFormat,
          custom_regex: customRegex || undefined,
        },
      });
    } else {
      // 创建模式
      await createTemplate.mutateAsync({
        name: templateName || `${deviceType}-${Date.now()}`,
        device_type: deviceType,
        connection,
        log_format: logFormat,
        custom_regex: customRegex || undefined,
      });
    }

    resetWizard();
    onFinish();
  };

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center mb-6">
        {isEditMode ? (
          <Edit3 className="w-12 h-12 text-accent mb-3" />
        ) : (
          <CheckCircle className="w-12 h-12 text-accent mb-3" />
        )}
        <h3 className="text-lg font-medium text-slate-200">
          {isEditMode ? '确认修改信息' : '确认配置信息'}
        </h3>
        <p className="text-sm text-slate-400">
          {isEditMode ? '请确认修改后点击保存' : '请确认以下配置后点击完成'}
        </p>
      </div>

      <div className="p-4 rounded-lg bg-slate-800 space-y-3">
        {/* 模板名称 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">模板名称</div>
            <div className="text-sm text-slate-200 font-medium truncate">
              {templateName || `${deviceTypeLabel}-${Date.now()}`}
            </div>
          </div>
        </div>

        {/* 设备类型 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Network className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">设备类型</div>
            <div className="text-sm text-slate-200">{deviceTypeLabel}</div>
          </div>
        </div>

        {/* 连接参数 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">连接参数</div>
            <div className="text-sm text-slate-200 font-mono">
              {connection?.protocol}://{connection?.host}:{connection?.port}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              用户: {connection?.username}
            </div>
          </div>
        </div>

        {/* 日志格式 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">日志格式</div>
            <div className="text-sm text-slate-200">{logFormatLabel}</div>
            {logFormat === 'Custom' && customRegex && (
              <div className="text-xs text-slate-500 mt-1 font-mono truncate">
                正则: {customRegex}
              </div>
            )}
            {logFormat === 'CustomPython' && customRegex && (
              <div className="text-xs text-emerald-400 mt-1">
                ✓ 自定义解析器已上传
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleFinish}
          disabled={isLoading}
          className="px-6 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '完成')}
        </button>
      </div>
    </div>
  );
}
