/**
 * 步骤 4: 完成 (合并模板设置 + 解析测试)
 *
 * 内部状态机:
 * - settings: 模板设置阶段（默认）
 * - testing: 解析测试阶段（用户点击「开始解析测试」后）
 * - confirmed: 确认阶段（测试通过后）
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Server, Network, Globe, Edit3, ArrowLeft } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { useCreateTemplate, useUpdateTemplate } from '@/api/ingestionEndpoints';
import { ParseTestPanel } from './ParseTestPanel';
import { AccuracyBadge } from './AccuracyBadge';
import { DEVICE_TYPES, LOG_FORMATS } from '@/types/ingestion';
import type { ParseTestResult } from '@/types/ingestion';

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
    parseTestResult,
    isTestQualified,
    setParseTestResult,
  } = useIngestionStore();

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  // 内部状态机：settings -> testing -> confirmed
  const [step4Phase, setStep4Phase] = useState<'settings' | 'testing' | 'confirmed'>('settings');

  // 获取设备类型标签
  const deviceTypeLabel = DEVICE_TYPES.find(d => d.id === deviceType)?.label || deviceType;

  // 获取日志格式标签
  const logFormatLabel = LOG_FORMATS.find(f => f.id === logFormat)?.label || logFormat;

  // 处理开始解析测试
  const handleStartTest = () => {
    setStep4Phase('testing');
  };

  // 处理测试 qualified 回调
  const handleTestQualified = (result: ParseTestResult) => {
    setParseTestResult(result, true);
    setStep4Phase('confirmed');
  };

  // 处理再次测试
  const handleTestAgain = () => {
    setParseTestResult(null, false);
    setStep4Phase('testing');
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

  // ========== 渲染：settings 阶段 ==========
  const renderSettings = () => (
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
          {isEditMode ? '请确认修改后点击保存' : '请确认以下配置后开始解析测试'}
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
          onClick={handleStartTest}
          className="px-6 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          开始解析测试
        </button>
      </div>
    </div>
  );

  // ========== 渲染：testing 阶段 ==========
  const renderTesting = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center mb-6">
        <h3 className="text-lg font-medium text-slate-200 mb-2">
          解析测试
        </h3>
        <p className="text-sm text-slate-400">
          使用历史日志测试解析准确率，达标后可开启实时接入
        </p>
      </div>

      <ParseTestPanel
        templateId={editingTemplate?.id || ''}
        onQualified={handleTestQualified}
      />

      <div className="flex justify-start">
        <button
          onClick={() => setStep4Phase('settings')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回配置
        </button>
      </div>
    </div>
  );

  // ========== 渲染：confirmed 阶段 ==========
  const renderConfirmed = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center mb-6">
        <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
        <h3 className="text-lg font-medium text-slate-200">
          解析测试通过
        </h3>
        <p className="text-sm text-slate-400">
          准确率达标，可以开启实时接入
        </p>
      </div>

      {/* 准确率显示 */}
      {parseTestResult && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm text-slate-200 font-medium">解析成功</p>
              <p className="text-xs text-slate-400">
                {parseTestResult.success_count}/{parseTestResult.total_logs} 条
              </p>
            </div>
          </div>
          <AccuracyBadge accuracy={parseTestResult.overall_accuracy} />
        </div>
      )}

      {/* 未达标警告（不应该到达这个阶段，但作为防御） */}
      {!isTestQualified && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <div>
            <p className="text-sm text-slate-200 font-medium">准确率未达标</p>
            <p className="text-xs text-slate-400">请点击「再次测试」重试</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          onClick={handleTestAgain}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          再次测试
        </button>
        <button
          onClick={handleFinish}
          disabled={!isTestQualified || isLoading}
          className="px-6 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '处理中...' : '完成'}
        </button>
      </div>
    </div>
  );

  // 根据 step4Phase 渲染
  return (
    <div className="space-y-4">
      {step4Phase === 'settings' && renderSettings()}
      {step4Phase === 'testing' && renderTesting()}
      {step4Phase === 'confirmed' && renderConfirmed()}
    </div>
  );
}
