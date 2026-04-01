import { useState } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { LOG_FORMATS } from '@/types/ingestion';
import type { LogFormat } from '@/types/ingestion';
import { Upload, Download } from 'lucide-react';

const PYTHON_PARSER_TEMPLATE = `"""
自定义日志解析器
请实现 parse(line: str) -> dict 函数
返回解析后的字段字典，示例见下方注释
"""

def parse(line: str) -> dict:
    """
    解析单行日志

    Args:
        line: 原始日志行

    Returns:
        dict: 解析后的字段，包含以下可选键：
            - timestamp: 时间戳 (ISO 格式)
            - level: 日志级别 (INFO/WARN/ERROR)
            - source: 日志来源
            - message: 日志消息
            - raw: 原始日志行
    """
    # TODO: 实现你的解析逻辑
    # 示例:
    # if "ERROR" in line:
    #     return {"level": "ERROR", "message": line, "raw": line}
    return {"raw": line}
`;

// 下载解析器模板
function downloadTemplate() {
  const blob = new Blob([PYTHON_PARSER_TEMPLATE], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'log_parser_template.py';
  a.click();
  URL.revokeObjectURL(url);
}

export function Step3LogFormat() {
  const { logFormat, setLogFormat, customRegex, setCustomRegex } = useIngestionStore();
  const [localRegex, setLocalRegex] = useState(customRegex || '');
  const [pythonCode, setPythonCode] = useState('');

  const handleFormatSelect = (format: LogFormat) => {
    setLogFormat(format);
  };

  const handleRegexChange = (value: string) => {
    setLocalRegex(value);
    setCustomRegex(value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const code = ev.target?.result as string;
        setPythonCode(code);
        setCustomRegex(code);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {LOG_FORMATS.map((format) => {
          const isSelected = logFormat === format.id;

          return (
            <button
              key={format.id}
              onClick={() => handleFormatSelect(format.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-accent bg-accent/10'
                  : 'border-slate-700 hover:border-slate-500'
                }`}
            >
              <div className={`font-medium ${isSelected ? 'text-accent' : 'text-slate-200'}`}>
                {format.id}
              </div>
              <div className="text-sm text-slate-400">{format.description}</div>
            </button>
          );
        })}
      </div>

      {logFormat === 'Custom' && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">自定义正则表达式</label>
          <textarea
            value={localRegex}
            onChange={(e) => handleRegexChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 font-mono text-sm"
            rows={4}
            placeholder="例如: ^(\\d{4}-\\d{2}-\\d{2}).*?(ERROR|WARN).*$"
          />
        </div>
      )}

      {logFormat === 'CustomPython' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">解析器模板</span>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
            >
              <Download className="w-3 h-3" />
              下载模板
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">上传 Python 解析器</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">选择文件</span>
                <input
                  type="file"
                  accept=".py,.python"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {pythonCode && (
                <span className="text-xs text-emerald-400">✓ 已加载: log_parser.py</span>
              )}
            </div>
          </div>

          {pythonCode ? (
            <div className="mt-2">
              <label className="block text-sm text-slate-400 mb-1">解析器预览</label>
              <pre className="p-3 bg-slate-800 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto max-h-40">
                {pythonCode.slice(0, 500)}{pythonCode.length > 500 ? '\n...' : ''}
              </pre>
            </div>
          ) : (
            <pre className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400 font-mono">
              {PYTHON_PARSER_TEMPLATE.slice(0, 300)}...
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
