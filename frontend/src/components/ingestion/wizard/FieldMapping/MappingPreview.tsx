/**
 * 映射结果实时预览组件
 *
 * 状态:
 * - empty: 无数据
 * - parsing: 加载中
 * - success: 解析成功（绿色）
 * - error: 解析失败（红色）
 */

import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface MappingPreviewProps {
  templateId: string;
  fieldMappings: Record<string, string>;
  sampleLogs?: string[];
}

// 预览解析结果类型
interface PreviewParseResult {
  success: boolean;
  parsed_fields: Record<string, string>;
  raw: string;
}

async function fetchPreviewParse(
  templateId: string,
  fieldMappings: Record<string, string>,
  sampleLogs: string[]
): Promise<PreviewParseResult[]> {
  if (!templateId || Object.keys(fieldMappings).length === 0 || sampleLogs.length === 0) {
    return [];
  }

  const response = await fetch('/api/ingestion/preview-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,
      field_mappings: fieldMappings,
      sample_logs: sampleLogs,
    }),
  });

  if (!response.ok) {
    throw new Error('预览解析失败');
  }

  return response.json();
}

export function MappingPreview({ templateId, fieldMappings, sampleLogs = [] }: MappingPreviewProps) {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['preview-parse', templateId, fieldMappings, sampleLogs],
    queryFn: () => fetchPreviewParse(templateId, fieldMappings, sampleLogs),
    enabled: !!templateId && Object.keys(fieldMappings).length > 0 && sampleLogs.length > 0,
    refetchOnWindowFocus: false,
  });

  // 空状态
  if (Object.keys(fieldMappings).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400">暂无映射</p>
        <p className="text-xs text-slate-500 mt-1">请先在左侧建立字段映射</p>
      </div>
    );
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
        <p className="text-sm text-slate-400">正在预览解析结果...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-red-400">
          <XCircle className="w-5 h-5" />
          <span className="text-sm font-medium">预览解析失败</span>
        </div>
        <p className="text-xs text-red-400/70 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  // 无结果
  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400">暂无预览数据</p>
        <p className="text-xs text-slate-500 mt-1">请确保已提供示例日志</p>
      </div>
    );
  }

  // 统计解析结果
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const allSuccess = successCount === totalCount;

  return (
    <div className="space-y-3">
      {/* 结果统计 */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border ${
          allSuccess
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex items-center gap-2">
          {allSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400" />
          )}
          <span className={`text-sm font-medium ${allSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
            解析结果
          </span>
        </div>
        <div className="text-sm">
          <span className={allSuccess ? 'text-emerald-400' : 'text-amber-400'}>{successCount}</span>
          <span className="text-slate-500">/{totalCount}</span>
        </div>
      </div>

      {/* 解析详情 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              result.success
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-red-500/20 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-xs font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? '解析成功' : '解析失败'}
              </span>
            </div>

            {/* 原始日志 */}
            <div className="mb-2">
              <span className="text-xs text-slate-500">原始日志:</span>
              <p className="text-xs text-slate-300 font-mono truncate mt-0.5" title={result.raw}>
                {result.raw}
              </p>
            </div>

            {/* 解析字段 */}
            {result.success && result.parsed_fields && Object.keys(result.parsed_fields).length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(result.parsed_fields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-slate-200 font-mono truncate" title={String(value)}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
