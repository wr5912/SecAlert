/** SecAlert 前端主应用

入口组件，管理告警列表和详情视图切换
*/

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { AlertList } from './components/AlertList';
import { AlertDetail } from './components/AlertDetail';
import type { ViewMode } from './types';

export default function App() {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>();

  function handleSelectChain(chainId: string) {
    setSelectedChainId(chainId);
    setView('detail');
  }

  function handleBack() {
    setSelectedChainId(undefined);
    setView('list');
  }

  function handleStatusChange() {
    // 状态变更后刷新列表（由 AlertList 处理）
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl font-semibold text-slate-900">SecAlert</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === 'list' ? (
          <AlertList
            onSelectChain={handleSelectChain}
            selectedChainId={selectedChainId}
          />
        ) : (
          <AlertDetail
            chainId={selectedChainId!}
            onBack={handleBack}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
}
