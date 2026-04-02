/**
 * BatchImportModal - 批量导入对话框
 *
 * 支持 CSV/Excel 文件上传，解析预览，批量导入
 * 状态: closed, file-select, parsing, complete, error
 */

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeviceTable } from './DeviceTable';
import type { BatchDevice, BatchCreateResponse, BatchImportState } from '@/types/ingestion';

interface BatchImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: BatchCreateResponse) => void;
}

export function BatchImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: BatchImportModalProps) {
  // 状态
  const [state, setState] = useState<BatchImportState>('closed');
  const [fileName, setFileName] = useState<string>('');
  const [devices, setDevices] = useState<BatchDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
  const [rowStates, setRowStates] = useState<Record<number, 'normal' | 'error'>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [importResult, setImportResult] = useState<BatchCreateResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 文件大小限制 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // 解析文件
  const parseFile = useCallback(async (file: File) => {
    setState('parsing');
    setErrorMessage('');

    try {
      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`文件大小超过 5MB 限制（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`);
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(sheet);

      // 验证并转换数据
      const parsedDevices: BatchDevice[] = [];
      const errors: Record<number, 'error'> = {};

      rows.forEach((row, index) => {
        // 尝试多种列名格式
        const name = String(row['设备名称'] || row['name'] || row['名称'] || '').trim();
        const device_type = String(
          row['设备类型'] || row['device_type'] || row['类型'] || ''
        ).trim().toLowerCase();
        const host = String(row['主机'] || row['host'] || row['ip'] || '').trim();
        const port = parseInt(String(row['端口'] || row['port'] || row['端口号'] || '514')) || 514;
        const protocol = String(
          row['协议'] || row['protocol'] || row['连接协议'] || 'ssh'
        ).trim().toLowerCase();
        const log_format = String(
          row['日志格式'] || row['log_format'] || row['格式'] || 'Auto'
        ).trim();

        // 验证必填字段
        if (!name || !host) {
          errors[index] = 'error';
        }

        // 验证设备类型
        const validTypes = ['firewall', 'ids', 'vpn', 'switch', 'router', 'waf', 'other'];
        if (device_type && !validTypes.includes(device_type)) {
          errors[index] = 'error';
        }

        parsedDevices.push({
          name,
          device_type: device_type || 'other',
          host,
          port,
          protocol,
          log_format,
        });
      });

      // 检查是否有数据
      if (parsedDevices.length === 0) {
        throw new Error('文件中没有有效数据');
      }

      setDevices(parsedDevices);
      setRowStates(errors);
      setSelectedDevices(new Set(parsedDevices.map((_, i) => i)));
      setFileName(file.name);
      setState('file-select');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '文件解析失败'
      );
      setState('error');
    }
  }, []);

  // 处理文件拖拽
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
        parseFile(file);
      } else {
        setErrorMessage('文件格式错误：仅支持 .csv 和 .xlsx');
        setState('error');
      }
    },
    [parseFile]
  );

  // 处理文件选择
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        parseFile(file);
      }
    },
    [parseFile]
  );

  // 处理导入
  const handleImport = async () => {
    setIsImporting(true);

    try {
      const selectedDevicesList = Array.from(selectedDevices).map((i) => devices[i]);

      const response = await fetch('/api/ingestion/templates/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devices: selectedDevicesList,
        }),
      });

      if (!response.ok) {
        throw new Error('批量导入请求失败');
      }

      const result: BatchCreateResponse = await response.json();
      setImportResult(result);
      setState('complete');

      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导入失败');
      setState('error');
    } finally {
      setIsImporting(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setState('closed');
    setFileName('');
    setDevices([]);
    setSelectedDevices(new Set());
    setRowStates({});
    setErrorMessage('');
    setImportResult(null);
    setIsImporting(false);
  };

  // 关闭对话框
  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  // 选择变化
  const handleSelectionChange = (index: number, selected: boolean) => {
    const newSelected = new Set(selectedDevices);
    if (selected) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedDevices(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-accent">批量导入设备</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* 文件选择状态 */}
          {(state === 'closed' || state === 'file-select') && (
            <>
              {/* 拖拽区域 */}
              <div
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                <p className="text-slate-300 mb-2">
                  拖拽 CSV/Excel 文件到此处，或点击选择文件
                </p>
                <p className="text-slate-500 text-sm">
                  支持 .csv 和 .xlsx 格式
                </p>
              </div>

              {/* 文件信息 */}
              {fileName && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-accent" />
                  <span className="text-slate-200">{fileName}</span>
                  <span className="text-slate-500 text-sm">
                    ({devices.length} 台设备)
                  </span>
                </div>
              )}

              {/* 预览表格 */}
              {devices.length > 0 && (
                <div className="mt-4">
                  <DeviceTable
                    devices={devices}
                    selectedDevices={selectedDevices}
                    onSelectionChange={handleSelectionChange}
                    rowStates={rowStates}
                  />
                </div>
              )}
            </>
          )}

          {/* 解析中状态 */}
          {state === 'parsing' && (
            <div className="text-center py-12">
              <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300">正在解析文件...</p>
            </div>
          )}

          {/* 错误状态 */}
          {state === 'error' && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-400 mb-2">文件解析失败</p>
              <p className="text-slate-400 text-sm mb-4">{errorMessage}</p>
              <Button variant="outline" onClick={handleReset}>
                重新选择文件
              </Button>
            </div>
          )}

          {/* 导入完成状态 */}
          {state === 'complete' && importResult && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
              <p className="text-lg text-slate-200 mb-4">导入完成</p>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <span className="text-emerald-400 text-2xl font-medium">
                    {importResult.success_count}
                  </span>
                  <span className="text-slate-400 ml-1">成功</span>
                </div>
                <div>
                  <span
                    className={`${
                      importResult.failure_count > 0 ? 'text-red-400' : 'text-slate-400'
                    } text-2xl font-medium`}
                  >
                    {importResult.failure_count}
                  </span>
                  <span className="text-slate-400 ml-1">失败</span>
                </div>
              </div>

              {/* 失败详情 */}
              {importResult.failure_count > 0 && (
                <div className="mt-6 text-left">
                  <p className="text-slate-300 text-sm mb-2">失败设备：</p>
                  <div className="bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {importResult.results
                      .filter((r) => r.status === 'failure')
                      .map((r, i) => (
                        <div key={i} className="text-sm text-red-400 py-1">
                          {r.name}: {r.error}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <DialogFooter>
          {state === 'file-select' && (
            <>
              <Button variant="ghost" onClick={handleReset}>
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedDevices.size === 0 || isImporting}
              >
                {isImporting ? '导入中...' : `导入 ${selectedDevices.size} 台设备`}
              </Button>
            </>
          )}
          {state === 'complete' && (
            <Button onClick={handleClose}>完成</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
