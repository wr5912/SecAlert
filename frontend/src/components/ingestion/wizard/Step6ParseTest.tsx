/**
 * 步骤 6: 解析测试 (DI-09)
 *
 * 使用历史日志测试解析准确率
 * 达标后启用完成按钮
 */

import { useIngestionStore } from '@/stores/ingestionStore';
import { useCreateTemplate, useUpdateTemplate } from '@/api/ingestionEndpoints';
import { ParseTestPanel } from './ParseTestPanel';
import type { ParseTestResult } from '@/types/ingestion';

interface Step6ParseTestProps {
  onFinish: () => void;
}

export function Step6ParseTest({ onFinish }: Step6ParseTestProps) {
  const {
    deviceType,
    connection,
    logFormat,
    customRegex,
    templateName,
    resetWizard,
    isEditMode,
    editingTemplate,
    parseTestResult,
    isTestQualified,
    setParseTestResult,
  } = useIngestionStore();

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  // 获取模板 ID（编辑模式下使用已有模板 ID）
  const templateId = editingTemplate?.id || '';

  // 处理测试结果
  const handleTestQualified = (result: ParseTestResult) => {
    setParseTestResult(result, true);
  };

  // 处理完成
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
        <h3 className="text-lg font-medium text-slate-200 mb-2">
          解析测试
        </h3>
        <p className="text-sm text-slate-400">
          使用历史日志测试解析准确率，达标后可开启实时接入
        </p>
      </div>

      {/* 解析测试面板 */}
      <ParseTestPanel
        templateId={templateId}
        onQualified={handleTestQualified}
      />

      {/* 完成按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        {isTestQualified && parseTestResult && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 mr-auto">
            <span>准确率 {parseTestResult.overall_accuracy >= 1
              ? parseTestResult.overall_accuracy * 100
              : parseTestResult.overall_accuracy}% 达标</span>
          </div>
        )}
        <button
          onClick={handleFinish}
          disabled={!isTestQualified || isLoading}
          className="px-6 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '处理中...' : isTestQualified ? '完成' : '请先通过解析测试'}
        </button>
      </div>
    </div>
  );
}
