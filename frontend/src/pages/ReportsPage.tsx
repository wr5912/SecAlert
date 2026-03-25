/**
 * 报表页面
 *
 * 展示告警趋势分析和报表导出功能
 */

import { useState, useEffect } from 'react';
import { TrendChart } from '../components/charts/TrendChart';

interface TrendData {
  date: string;
  total: number;
  truePositives: number;
  falsePositives: number;
}

export function ReportsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports/trends?days=7')
      .then(res => {
        if (!res.ok) throw new Error('获取趋势数据失败');
        return res.json();
      })
      .then(setTrends)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">报表中心</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">告警趋势 (近7天)</h2>
        {trends.length > 0 ? (
          <TrendChart data={trends} />
        ) : (
          <div className="text-gray-500 text-center py-8">暂无数据</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">报表导出</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">日报</h3>
            <div className="space-x-2">
              <a
                href="/api/reports/export/pdf?report_type=daily"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                下载 PDF
              </a>
              <a
                href="/api/reports/export/excel?report_type=daily"
                className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                下载 Excel
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">周报</h3>
            <div className="space-x-2">
              <a
                href="/api/reports/export/pdf?report_type=weekly"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                下载 PDF
              </a>
              <a
                href="/api/reports/export/excel?report_type=weekly"
                className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                下载 Excel
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
