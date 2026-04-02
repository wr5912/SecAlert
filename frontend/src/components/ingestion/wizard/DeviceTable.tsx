/**
 * DeviceTable - 批量设备表格组件
 *
 * 显示解析后的设备列表，支持选择和错误状态高亮
 */

import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { BatchDevice, DeviceRowState } from '@/types/ingestion';

interface DeviceTableProps {
  devices: BatchDevice[];
  selectedDevices: Set<number>;
  onSelectionChange: (index: number, selected: boolean) => void;
  rowStates?: Record<number, DeviceRowState>;
}

export function DeviceTable({
  devices,
  selectedDevices,
  onSelectionChange,
  rowStates = {},
}: DeviceTableProps) {
  // 获取设备类型的显示标签
  const getDeviceTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      firewall: '防火墙',
      ids: '入侵检测',
      vpn: 'VPN',
      switch: '交换机',
      router: '路由器',
      waf: 'WAF',
      other: '其他',
    };
    return typeMap[type] || type;
  };

  // 获取行的样式
  const getRowClass = (index: number): string => {
    const state = rowStates[index] || 'normal';
    const baseClass = 'border-b border-slate-700/50 transition-colors';

    if (state === 'error') {
      return `${baseClass} bg-red-500/10 hover:bg-red-500/20`;
    }
    if (selectedDevices.has(index)) {
      return `${baseClass} bg-accent/5 hover:bg-accent/10`;
    }
    return `${baseClass} hover:bg-slate-800/50`;
  };

  // 判断是否有错误行
  const hasErrors = Object.values(rowStates).some((state) => state === 'error');

  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        暂无设备数据
      </div>
    );
  }

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* 表头 */}
      <div className="grid grid-cols-[40px_1fr_100px_1fr_80px_80px_80px] gap-2 px-4 py-3 bg-slate-800/80 text-sm font-medium text-slate-300">
        <div className="flex items-center">
          <Checkbox.Root
            className="w-5 h-5 border-2 border-slate-500 rounded flex items-center justify-center bg-slate-800 hover:border-accent transition-colors"
            checked={selectedDevices.size === devices.length}
            onCheckedChange={(checked: boolean) => {
              if (checked) {
                devices.forEach((_, i) => onSelectionChange(i, true));
              } else {
                devices.forEach((_, i) => onSelectionChange(i, false));
              }
            }}
          >
            <Checkbox.Indicator className="text-accent">
              <Check className="w-4 h-4" />
            </Checkbox.Indicator>
          </Checkbox.Root>
        </div>
        <div>设备名称</div>
        <div>设备类型</div>
        <div>主机</div>
        <div>端口</div>
        <div>协议</div>
        <div>状态</div>
      </div>

      {/* 表体 */}
      <div className="max-h-[300px] overflow-y-auto">
        {devices.map((device, index) => (
          <div
            key={index}
            className={`grid grid-cols-[40px_1fr_100px_1fr_80px_80px_80px] gap-2 px-4 py-3 items-center text-sm ${getRowClass(
              index
            )}`}
          >
            <div className="flex items-center">
              <Checkbox.Root
                className="w-5 h-5 border-2 border-slate-500 rounded flex items-center justify-center bg-slate-800 hover:border-accent transition-colors"
                checked={selectedDevices.has(index)}
                onCheckedChange={(checked: boolean) =>
                  onSelectionChange(index, !!checked)
                }
              >
                <Checkbox.Indicator className="text-accent">
                  <Check className="w-4 h-4" />
                </Checkbox.Indicator>
              </Checkbox.Root>
            </div>
            <div className="truncate text-slate-200" title={device.name}>
              {device.name}
            </div>
            <div className="text-slate-400">
              {getDeviceTypeLabel(device.device_type)}
            </div>
            <div className="truncate text-slate-400" title={device.host}>
              {device.host}
            </div>
            <div className="text-slate-400">{device.port}</div>
            <div className="text-slate-400 uppercase">{device.protocol}</div>
            <div>
              {rowStates[index] === 'error' ? (
                <span className="text-red-400 text-xs">解析错误</span>
              ) : selectedDevices.has(index) ? (
                <span className="text-emerald-400 text-xs">已选择</span>
              ) : (
                <span className="text-slate-500 text-xs">待导入</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 text-sm text-slate-400">
        共 {devices.length} 台设备
        {selectedDevices.size > 0 && `，已选择 ${selectedDevices.size} 台`}
        {hasErrors && (
          <span className="text-red-400 ml-2">
            ({Object.values(rowStates).filter((s) => s === 'error').length} 个错误)
          </span>
        )}
      </div>
    </div>
  );
}
