/**
 * AI 识别面板组件 (DI-07)
 *
 * 调用 AI 自动识别日志格式，显示识别结果
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useIngestionStore } from '@/stores/ingestionStore';
import type { LogFormatRecognitionResult } from '@/types/ingestion';
import { Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type DetectState = 'idle' | 'loading' | 'success' | 'error';

interface DetectPanelProps {
  onSuccess?: (result: LogFormatRecognitionResult) => void;
}

export function AIDetectPanel({ onSuccess }: DetectPanelProps) {
  const { sampleLogs, setAiRecognitionResult, setFieldMappings, setCurrentTemplateId } = useIngestionStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (logs: string[]) => {
      const response = await fetch('/api/ingestion/recognize-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json() as Promise<LogFormatRecognitionResult>;
    },
    onSuccess: async (data) => {
      setAiRecognitionResult(data);
      setFieldMappings(data.field_mappings || {});

      // 自动保存模板 (Gap-05: AI 识别成功后自动保存模板)
      const templateName = `AI识别-${data.detected_format}-${Date.now()}`;
      try {
        const response = await fetch('/api/ingestion/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            device_type: 'other',
            connection: { host: '', port: 514, username: '', password: '', protocol: 'syslog' },
            log_format: data.detected_format,
            custom_regex: data.regex_pattern
          }),
        });
        if (response.ok) {
          const template = await response.json();
          setCurrentTemplateId(template.id);
        }
      } catch (e) {
        console.error('Auto-save template failed:', e);
      }

      setErrorMessage(null);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const handleDetect = () => {
    if (sampleLogs.length < 3) {
      setErrorMessage('请输入至少 3 条示例日志');
      return;
    }
    mutation.reset();
    mutation.mutate(sampleLogs);
  };

  const getState = (): DetectState => {
    if (mutation.isPending) return 'loading';
    if (mutation.isSuccess) return 'success';
    if (mutation.isError || errorMessage) return 'error';
    return 'idle';
  };

  const state = getState();
  const hasEnoughLogs = sampleLogs.length >= 3;

  return (
    <div className="space-y-4">
      {/* 按钮区域 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDetect}
          disabled={!hasEnoughLogs || mutation.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${hasEnoughLogs && !mutation.isPending
              ? 'bg-accent/20 text-accent hover:bg-accent/30 border border-accent/50'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              识别中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              开始识别
            </>
          )}
        </button>

        {/* 帮助文本 */}
        {state === 'idle' && !hasEnoughLogs && (
          <span className="text-xs text-slate-500">
            请先输入至少 3 条示例日志
          </span>
        )}
      </div>

      {/* 错误状态 */}
      {state === 'error' && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-red-400 font-medium">识别失败</p>
            <p className="text-xs text-red-300/80">
              {errorMessage || mutation.error?.message || '请检查日志格式或尝试手动映射'}
            </p>
          </div>
        </div>
      )}

      {/* 成功状态 */}
      {state === 'success' && mutation.data && (
        <div className="space-y-3">
          {/* 识别结果卡片 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
            {/* 格式和置信度 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-200 font-medium">识别结果</span>
              </div>

              {/* 置信度徽章 */}
              <ConfidenceBadge confidence={mutation.data.confidence} />
            </div>

            {/* 检测到的格式 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">检测到的格式:</span>
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-sm rounded font-medium">
                {mutation.data.detected_format}
              </span>
            </div>

            {/* 正则表达式 */}
            {mutation.data.regex_pattern && (
              <div className="space-y-1">
                <span className="text-xs text-slate-400">推荐正则:</span>
                <pre className="p-2 bg-slate-900 rounded text-xs text-slate-300 font-mono overflow-x-auto">
                  {mutation.data.regex_pattern.length > 100
                    ? mutation.data.regex_pattern.slice(0, 100) + '...'
                    : mutation.data.regex_pattern}
                </pre>
              </div>
            )}

            {/* 识别理由 */}
            {mutation.data.reasoning && (
              <div className="space-y-1">
                <span className="text-xs text-slate-400">识别说明:</span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {mutation.data.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* 置信度警告 (低于 0.7) */}
          {mutation.data.confidence < 0.7 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-amber-400 font-medium">需人工确认</p>
                <p className="text-xs text-amber-300/80">
                  置信度较低 ({Math.round(mutation.data.confidence * 100)}%)，
                  建议检查识别结果是否正确
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 置信度徽章组件
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);

  let colorClass = 'bg-emerald-500/20 text-emerald-400';
  if (percentage < 70) {
    colorClass = 'bg-amber-500/20 text-amber-400';
  } else if (percentage < 85) {
    colorClass = 'bg-sky-500/20 text-sky-400';
  }

  return (
    <span className={`px-2 py-0.5 rounded text-sm font-medium ${colorClass}`}>
      {percentage}% 置信度
    </span>
  );
}
