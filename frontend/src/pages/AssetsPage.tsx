/**
 * 资产图谱页面
 * 路由: /analysis/assets
 * 展示所有资产及其关系
 */

import { Server } from 'lucide-react';

export function AssetsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题 */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/30">
        <h2 className="text-lg font-semibold text-slate-200">资产图谱</h2>
        <p className="text-sm text-slate-400 mt-1">查看所有资产及其关联关系</p>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Server className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">资产图谱</h3>
          <p className="text-slate-500 max-w-md">
            从告警中选择资产后可查看详细的资产上下文和关联关系
          </p>
        </div>
      </div>
    </div>
  );
}

export default AssetsPage;
