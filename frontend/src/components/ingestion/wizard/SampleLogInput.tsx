/**
 * 示例日志输入组件 (DI-07)
 *
 * 用户输入 3-5 条示例日志供 AI 分析
 */

import { useState } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { AlertCircle } from 'lucide-react';

interface SampleLogInputProps {
  onLogsChange?: (logs: string[]) => void;
}

type InputState = 'empty' | 'filled' | 'error';

export function SampleLogInput({ onLogsChange }: SampleLogInputProps) {
  const { sampleLogs, setSampleLogs } = useIngestionStore();
  const [localInput, setLocalInput] = useState(sampleLogs.join('\n'));
  const [error, setError] = useState<string | null>(null);

  const lines = localInput.split('\n').filter(line => line.trim().length > 0);
  const lineCount = lines.length;

  const getState = (): InputState => {
    if (error) return 'error';
    if (lineCount === 0) return 'empty';
    return 'filled';
  };

  const state = getState();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInput(value);

    // 验证日志格式
    const lines = value.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0 && lines.length < 3) {
      setError('请输入至少 3 条示例日志');
    } else if (lines.length > 10) {
      setError('最多支持 10 条示例日志');
    } else {
      setError(null);
    }

    // 更新 store
    setSampleLogs(lines);
    onLogsChange?.(lines);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">
          示例日志
        </label>
        <span className={`text-xs ${
          lineCount < 3 ? 'text-slate-500' :
          lineCount <= 5 ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {lineCount}/5 条 (建议 3-5 条)
        </span>
      </div>

      <div className="relative">
        <textarea
          value={localInput}
          onChange={handleChange}
          placeholder={`请粘贴 3-5 条示例日志，每条一行...\n\n示例:\nCEF:0|Check Point|VPN-1|1.0|123|SSH Login Success|5|src=192.168.1.100 dst=10.0.0.1 spt=54321 dpt=22`}
          className={`w-full px-3 py-2 border rounded-lg bg-slate-700 text-slate-200 font-mono text-sm
            resize-none transition-colors
            ${state === 'error' ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-accent'}
            focus:outline-none focus:ring-1`}
          rows={6}
        />

        {/* 字符数统计 */}
        <div className="absolute bottom-2 right-2 text-xs text-slate-500">
          {localInput.length} 字符
        </div>
      </div>

      {/* 错误提示 */}
      {state === 'error' && error && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* 帮助文本 */}
      {state === 'empty' && (
        <p className="text-xs text-slate-500">
          输入至少 3 条示例日志，系统将自动识别日志格式并推荐字段映射
        </p>
      )}

      {/* 格式提示 */}
      {state === 'filled' && (
        <div className="text-xs text-slate-400 space-y-1">
          <p>已输入 {lineCount} 条日志</p>
          {lineCount < 3 && (
            <p className="text-amber-400">建议至少输入 3 条以提高识别准确率</p>
          )}
        </div>
      )}
    </div>
  );
}
