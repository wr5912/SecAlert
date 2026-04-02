/**
 * Step5BatchImport - 批量导入步骤
 *
 * 提供批量导入入口，显示已导入设备数量
 */

import { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { BatchImportModal } from './BatchImportModal';
import { useIngestionStore } from '@/stores/ingestionStore';

export function Step5BatchImport() {
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const { batchDevices, batchImportResult } = useIngestionStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <FileSpreadsheet className="w-12 h-12 text-accent mb-3" />
        <h3 className="text-lg font-medium text-slate-200">批量导入设备</h3>
        <p className="text-sm text-slate-400">
          通过 CSV/Excel 文件批量导入多个设备
        </p>
      </div>

      {/* 批量导入卡片 */}
      <div
        className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
        onClick={() => setIsBatchModalOpen(true)}
      >
        <Upload className="h-10 w-10 mx-auto text-slate-500 mb-4" />
        <p className="text-slate-300 mb-2">点击上传 CSV/Excel 文件</p>
        <p className="text-slate-500 text-sm">
          支持 .csv 和 .xlsx 格式，可一次导入多个设备
        </p>
      </div>

      {/* 已导入设备统计 */}
      {batchDevices.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">已导入设备</span>
            <span className="text-lg font-medium text-accent">
              {batchDevices.length}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {batchImportResult ? (
              <>
                成功 {batchImportResult.success_count}，失败{' '}
                {batchImportResult.failure_count}
              </>
            ) : (
              '等待导入'
            )}
          </div>
        </div>
      )}

      {/* 批量导入对话框 */}
      <BatchImportModal
        open={isBatchModalOpen}
        onOpenChange={setIsBatchModalOpen}
        onImportComplete={(result) => {
          // 导入完成后的回调
          console.log('Batch import complete:', result);
        }}
      />

      {/* 提示信息 */}
      <div className="text-xs text-slate-500 text-center">
        批量导入可将多个设备统一应用到相同模板配置
      </div>
    </div>
  );
}
