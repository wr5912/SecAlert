/**
 * 解析测试面板 (DI-09)
 *
 * 用历史日志测试解析准确率
 * 状态: idle, testing, success, failure
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AccuracyBadge } from './AccuracyBadge';
import type { ParseTestResult, ParseTestState } from '@/types/ingestion';

interface ParseTestPanelProps {
  templateId: string;
  onQualified?: (result: ParseTestResult) => void;
}

// API 函数
async function testParse(request: { template_id: string; test_logs: string[] }): Promise<ParseTestResult> {
  const response = await fetch('/api/ingestion/test-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export function ParseTestPanel({ templateId, onQualified }: ParseTestPanelProps) {
  const [testLogs, setTestLogs] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [parseState, setParseState] = useState<ParseTestState>('idle');
  const [testResult, setTestResult] = useState<ParseTestResult | null>(null);

  const testMutation = useMutation({
    mutationFn: testParse,
    onMutate: () => {
      setParseState('testing');
    },
    onSuccess: (data) => {
      setTestResult(data);
      setParseState(data.is_qualified ? 'success' : 'failure');

      // 如果达标，通知父组件
      if (data.is_qualified && onQualified) {
        onQualified(data);
      }
    },
    onError: (error) => {
      console.error('Parse test failed:', error);
      setParseState('failure');
    },
  });

  // 解析日志文本
  const parseLogLines = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 1000); // 最多 1000 条
  };

  // 处理测试
  const handleTest = () => {
    const logs = parseLogLines(testLogs);
    if (logs.length === 0) return;

    setTestResult(null);
    testMutation.mutate({
      template_id: templateId,
      test_logs: logs,
    });
  };

  // 计算进度
  const progress = testResult
    ? ((testResult.success_count + testResult.failure_count) / testResult.total_logs) * 100
    : 0;

  // 渲染空闲状态
  const renderIdle = () => (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        <p>粘贴 1-1000 条历史日志，系统将测试解析准确率。</p>
        <p className="mt-1">准确率达标后即可开启实时接入。</p>
      </div>

      <Textarea
        value={testLogs}
        onChange={(e) => setTestLogs(e.target.value)}
        placeholder={`粘贴测试日志，每行一条...

示例:
CEF:1|Check Point|VPN-1|123|accept|src=192.168.1.100 dst=10.0.0.1 spt=12345 dpt=443
CEF:1|Check Point|VPN-1|124|accept|src=192.168.1.101 dst=10.0.0.2 spt=54321 dpt=80`}
        className="min-h-[200px] font-mono text-xs bg-slate-800/50 border-slate-700"
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {testLogs.trim() ? `${parseLogLines(testLogs).length} 条日志` : '暂未输入日志'}
        </div>
        <Button
          onClick={handleTest}
          disabled={!testLogs.trim()}
          className="bg-accent text-background hover:bg-accent/90"
        >
          开始测试
        </Button>
      </div>
    </div>
  );

  // 渲染测试中状态
  const renderTesting = () => (
    <div className="space-y-4 py-8">
      <div className="flex flex-col items-center text-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="text-slate-300">正在测试解析...</p>
        <p className="text-xs text-slate-500 mt-1">使用 ThreeTierParser 解析日志</p>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );

  // 渲染成功状态
  const renderSuccess = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        {/* 整体结果 */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm text-slate-200 font-medium">解析成功</p>
              <p className="text-xs text-slate-400">
                {testResult.success_count}/{testResult.total_logs} 条
              </p>
            </div>
          </div>
          <AccuracyBadge accuracy={testResult.overall_accuracy} />
        </div>

        {/* 字段级准确率 */}
        {testResult.field_accuracies.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-300 font-medium">字段级准确率</div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400 font-medium">字段</th>
                    <th className="text-center p-2 text-slate-400 font-medium">正确</th>
                    <th className="text-center p-2 text-slate-400 font-medium">总计</th>
                    <th className="text-right p-2 text-slate-400 font-medium">准确率</th>
                  </tr>
                </thead>
                <tbody>
                  {testResult.field_accuracies.map((field) => (
                    <tr key={field.field_name} className="border-b border-slate-700/50 last:border-0">
                      <td className="p-2 text-slate-300 font-mono">{field.field_name}</td>
                      <td className="p-2 text-center text-slate-400">{field.correct}</td>
                      <td className="p-2 text-center text-slate-400">{field.total}</td>
                      <td className="p-2 text-right">
                        <AccuracyBadge accuracy={field.accuracy} showLabel={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 失败样例 */}
        {testResult.failed_samples.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-slate-300 font-medium hover:text-slate-200"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              失败样例 ({testResult.failed_samples.length})
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden space-y-2 p-3">
                {testResult.failed_samples.slice(0, 5).map((sample, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-mono text-slate-400 truncate">{sample.log}</div>
                    {sample.error && (
                      <div className="text-red-400 mt-1">错误: {sample.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 重新测试按钮 */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setTestLogs('');
              setTestResult(null);
              setParseState('idle');
            }}
            className="text-slate-400 hover:text-slate-200"
          >
            重新测试
          </Button>
        </div>
      </div>
    );
  };

  // 渲染失败状态
  const renderFailure = () => {
    if (!testResult) {
      return (
        <div className="space-y-4 py-8">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-300">测试失败</p>
            <p className="text-xs text-slate-500 mt-1">
              {testMutation.error?.message || '请检查日志格式或配置'}
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => {
                setTestResult(null);
                setParseState('idle');
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              重试
            </Button>
          </div>
        </div>
      );
    }

    // 有结果但未达标
    return (
      <div className="space-y-4">
        {/* 整体结果 */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-sm text-slate-200 font-medium">准确率未达标</p>
              <p className="text-xs text-slate-400">
                {testResult.success_count}/{testResult.total_logs} 条解析成功
              </p>
            </div>
          </div>
          <AccuracyBadge accuracy={testResult.overall_accuracy} />
        </div>

        {/* 提示信息 */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-slate-300">
          <p className="font-medium text-amber-400 mb-1">请调整字段映射</p>
          <p className="text-xs text-slate-400">
            准确率低于 85%，请返回上一步调整字段映射或日志格式配置。
          </p>
        </div>

        {/* 字段级准确率 */}
        {testResult.field_accuracies.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-300 font-medium">字段级准确率</div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400 font-medium">字段</th>
                    <th className="text-center p-2 text-slate-400 font-medium">正确</th>
                    <th className="text-center p-2 text-slate-400 font-medium">总计</th>
                    <th className="text-right p-2 text-slate-400 font-medium">准确率</th>
                  </tr>
                </thead>
                <tbody>
                  {testResult.field_accuracies.map((field) => (
                    <tr key={field.field_name} className="border-b border-slate-700/50 last:border-0">
                      <td className="p-2 text-slate-300 font-mono">{field.field_name}</td>
                      <td className="p-2 text-center text-slate-400">{field.correct}</td>
                      <td className="p-2 text-center text-slate-400">{field.total}</td>
                      <td className="p-2 text-right">
                        <AccuracyBadge accuracy={field.accuracy} showLabel={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 重新测试按钮 */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setTestLogs('');
              setTestResult(null);
              setParseState('idle');
            }}
            className="text-slate-400 hover:text-slate-200"
          >
            重新测试
          </Button>
        </div>
      </div>
    );
  };

  // 根据状态渲染
  return (
    <div className="space-y-4">
      {parseState === 'idle' && renderIdle()}
      {parseState === 'testing' && renderTesting()}
      {parseState === 'success' && renderSuccess()}
      {parseState === 'failure' && renderFailure()}
    </div>
  );
}
