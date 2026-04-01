import { CheckCircle } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { useCreateTemplate } from '@/api/ingestionEndpoints';

interface Step4CompleteProps {
  onFinish: () => void;
}

export function Step4Complete({ onFinish }: Step4CompleteProps) {
  const { deviceType, connection, logFormat, customRegex, templateName, resetWizard } = useIngestionStore();
  const createTemplate = useCreateTemplate();

  const handleFinish = async () => {
    if (!deviceType || !connection || !logFormat) return;

    await createTemplate.mutateAsync({
      name: templateName || `${deviceType}-${Date.now()}`,
      device_type: deviceType,
      connection,
      log_format: logFormat,
      custom_regex: customRegex || undefined,
    });

    resetWizard();
    onFinish();
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle className="w-16 h-16 text-accent mb-4" />
      <h3 className="text-lg font-medium text-slate-200 mb-2">配置完成</h3>
      <p className="text-sm text-slate-400 mb-6">
        数据源「{templateName || deviceType}」已成功创建
      </p>
      <div className="w-full p-4 rounded-lg bg-slate-800 text-left text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-400">设备类型:</span>
          <span className="text-slate-200">{deviceType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">主机:</span>
          <span className="text-slate-200 font-mono">{connection?.host}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">日志格式:</span>
          <span className="text-slate-200">{logFormat}</span>
        </div>
      </div>
      <button
        onClick={handleFinish}
        className="mt-6 px-6 py-2 bg-accent text-background rounded-lg font-medium"
      >
        完成
      </button>
    </div>
  );
}
