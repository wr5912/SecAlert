import { useState } from 'react';
import { useIngestionStore } from '@/stores/ingestionStore';
import { LOG_FORMATS } from '@/types/ingestion';
import type { LogFormat } from '@/types/ingestion';
import { Upload, Download, Sparkles } from 'lucide-react';
import { SampleLogInput } from './SampleLogInput';
import { AIDetectPanel } from './AIDetectPanel';
import { FieldMapper, MappingPreview } from './FieldMapping';

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

type ConfigMode = 'auto' | 'manual';

export function Step3LogFormat() {
  const { logFormat, setLogFormat, customRegex, setCustomRegex, aiRecognitionResult, fieldMappings, currentTemplateId, sampleLogs } = useIngestionStore();
  const [localRegex, setLocalRegex] = useState(customRegex || '');
  const [pythonCode, setPythonCode] = useState('');
  const [configMode, setConfigMode] = useState<ConfigMode>('manual');

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
      {/* 模式切换标签页 */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        <button
          onClick={() => setConfigMode('auto')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${configMode === 'auto'
              ? 'bg-accent/20 text-accent'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Sparkles className="w-4 h-4" />
          自动识别
        </button>
        <button
          onClick={() => setConfigMode('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${configMode === 'manual'
              ? 'bg-accent/20 text-accent'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          手动配置
        </button>
      </div>

      {/* 自动识别模式 */}
      {configMode === 'auto' && (
        <div className="space-y-4">
          <SampleLogInput />
          <AIDetectPanel />

          {/* AI 识别成功后显示字段映射和预览 */}
          {aiRecognitionResult && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              {/* 分割线标题 */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">字段映射与预览</span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              {/* 字段映射 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">拖拽调整字段映射</label>
                <FieldMapper
                  sourceFields={aiRecognitionResult.detected_fields || Object.keys(aiRecognitionResult.field_mappings || {})}
                  onMappingsChange={(mappings) => {
                    // 映射变更时可以执行额外操作
                    console.log('Mappings changed:', mappings);
                  }}
                />
              </div>

              {/* 映射预览 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">解析预览</label>
                <MappingPreview
                  templateId={currentTemplateId || ''}
                  fieldMappings={fieldMappings}
                  sampleLogs={sampleLogs}
                />
              </div>

              {/* 应用映射按钮 */}
              <div className="flex justify-end">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors text-sm font-medium"
                  onClick={() => {
                    // 应用映射：保存映射到 store，并更新已保存模板的 custom_regex 字段
                    if (currentTemplateId) {
                      fetch(`/api/ingestion/templates/${currentTemplateId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          custom_regex: aiRecognitionResult?.regex_pattern
                        }),
                      }).then(res => {
                        if (res.ok) {
                          console.log('映射已保存');
                        }
                      }).catch(e => console.error('保存映射失败:', e));
                    }
                    // 映射已保存在 store 的 fieldMappings 中，可被后续步骤使用
                    console.log('应用映射:', fieldMappings);
                  }}
                >
                  应用映射
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 手动配置模式 */}
      {configMode === 'manual' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {LOG_FORMATS.filter(f => f.id !== 'Auto').map((format) => {
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
                placeholder="例如: ^(\d{4}-\d{2}-\d{2}).*?(ERROR|WARN).*$"
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
        </>
      )}
    </div>
  );
}
