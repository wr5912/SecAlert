/**
 * 拖拽式字段映射主组件
 *
 * 功能:
 * - 左侧显示源字段列表（从 AI 识别结果提取）
 * - 右侧显示目标标准字段（下拉选择）
 * - 拖拽源字段到目标区域完成映射
 * - 映射变更时实时预览解析结果
 */

import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { DraggableField } from './DraggableField';
import { useIngestionStore } from '@/stores/ingestionStore';
import { Loader2, AlertCircle } from 'lucide-react';

// 标准目标字段列表
export const STANDARD_TARGET_FIELDS = [
  { id: 'timestamp', label: '时间戳 (timestamp)', description: '事件发生时间' },
  { id: 'src_ip', label: '源 IP (src_ip)', description: '来源 IP 地址' },
  { id: 'dst_ip', label: '目标 IP (dst_ip)', description: '目标 IP 地址' },
  { id: 'src_port', label: '源端口 (src_port)', description: '来源端口号' },
  { id: 'dst_port', label: '目标端口 (dst_port)', description: '目标端口号' },
  { id: 'protocol', label: '协议 (protocol)', description: '网络协议 TCP/UDP/ICMP' },
  { id: 'action', label: '动作 (action)', description: '允许/拒绝/告警等' },
  { id: 'message', label: '消息 (message)', description: '原始消息内容' },
  { id: 'severity', label: '严重度 (severity)', description: '事件严重程度' },
  { id: 'device_name', label: '设备名称 (device_name)', description: '日志来源设备' },
  { id: 'event_type', label: '事件类型 (event_type)', description: '事件分类' },
  { id: 'raw', label: '原始日志 (raw)', description: '未解析的原始日志' },
];

interface FieldMapperProps {
  sourceFields: string[];
  templateId?: string;
  onMappingsChange?: (mappings: Record<string, string>) => void;
}

// 预览解析结果类型
export interface PreviewParseResult {
  success: boolean;
  parsed_fields: Record<string, string>;
  raw: string;
}

async function fetchPreviewParse(
  templateId: string | undefined,
  mappings: Record<string, string>
): Promise<PreviewParseResult[]> {
  if (!templateId || Object.keys(mappings).length === 0) {
    return [];
  }

  const response = await fetch('/api/ingestion/preview-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, field_mappings: mappings }),
  });

  if (!response.ok) {
    throw new Error('预览解析失败');
  }

  return response.json();
}

export function FieldMapper({ sourceFields, templateId, onMappingsChange }: FieldMapperProps) {
  const { fieldMappings, setFieldMappings } = useIngestionStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // 预览解析结果查询
  const { data: previewResults, isLoading: isPreviewLoading } = useQuery({
    queryKey: ['preview-parse', templateId, fieldMappings],
    queryFn: () => fetchPreviewParse(templateId, fieldMappings),
    enabled: !!templateId && Object.keys(fieldMappings).length > 0,
  });

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeData = active.data.current;
      const overId = over.id as string;

      // 如果拖拽到目标字段区域，建立映射
      if (activeData?.type === 'source') {
        const sourceFieldId = activeData.field?.id || active.id;

        // 检查是否拖拽到了目标字段
        const targetField = STANDARD_TARGET_FIELDS.find((f) => f.id === overId);
        if (targetField) {
          // 移除该源字段之前的映射（如果有）
          const newMappings = { ...fieldMappings };
          Object.keys(newMappings).forEach((key) => {
            if (newMappings[key] === overId) {
              delete newMappings[key];
            }
          });
          // 建立新映射
          newMappings[sourceFieldId] = overId;
          setFieldMappings(newMappings);
          onMappingsChange?.(newMappings);
        }
      }
    },
    [fieldMappings, setFieldMappings, onMappingsChange]
  );

  // 拖拽开始
  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  // 手动选择目标字段建立映射
  const handleSelectTarget = useCallback(
    (sourceFieldId: string) => {
      if (!selectedTarget) return;

      const newMappings = { ...fieldMappings };
      // 移除目标字段之前的映射
      Object.keys(newMappings).forEach((key) => {
        if (newMappings[key] === selectedTarget) {
          delete newMappings[key];
        }
      });
      newMappings[sourceFieldId] = selectedTarget;
      setFieldMappings(newMappings);
      onMappingsChange?.(newMappings);
      setSelectedTarget(null);
    },
    [fieldMappings, selectedTarget, setFieldMappings, onMappingsChange]
  );

  // 检查字段是否已映射
  const isFieldMapped = useCallback(
    (fieldId: string) => {
      return Object.values(fieldMappings).includes(fieldId);
    },
    [fieldMappings]
  );

  // 获取字段的当前映射目标
  const getFieldMappingTarget = useCallback(
    (fieldId: string) => {
      const targetFieldId = Object.entries(fieldMappings).find(([key]) => key === fieldId)?.[1];
      if (!targetFieldId) return null;
      return STANDARD_TARGET_FIELDS.find((f) => f.id === targetFieldId);
    },
    [fieldMappings]
  );

  return (
    <div className="space-y-4">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* 左侧：源字段列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">源字段</label>
              <span className="text-xs text-slate-500">{sourceFields.length} 个字段</span>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 min-h-[200px] space-y-2">
              <SortableContext items={sourceFields} strategy={verticalListSortingStrategy}>
                {sourceFields.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-slate-500">
                    暂无源字段（请先进行 AI 识别）
                  </div>
                ) : (
                  sourceFields.map((field) => {
                    const isMapped = isFieldMapped(field);
                    const mappingTarget = getFieldMappingTarget(field);

                    return (
                      <div key={field} className="relative group">
                        <DraggableField
                          id={`source-${field}`}
                          name={field}
                          type="source"
                          isMapped={isMapped}
                        />
                        {/* 已映射时显示目标提示 */}
                        {isMapped && mappingTarget && (
                          <div className="mt-1 px-2 py-1 bg-emerald-500/10 rounded text-xs text-emerald-400">
                            → {mappingTarget.label}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </SortableContext>
            </div>
          </div>

          {/* 右侧：目标字段列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">目标标准字段</label>
              <span className="text-xs text-slate-500">拖拽或选择映射</span>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 min-h-[200px] space-y-2">
              {STANDARD_TARGET_FIELDS.map((field) => {
                const isOccupied = Object.values(fieldMappings).includes(field.id);

                return (
                  <div
                    key={field.id}
                    id={field.id}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 min-h-[44px]
                      transition-all duration-150
                      ${isOccupied ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600 bg-slate-800/30 hover:border-slate-400'}
                    `}
                  >
                    <span className="text-sm font-medium text-slate-200 truncate">{field.label}</span>
                    {isOccupied && (
                      <span className="flex-shrink-0 text-xs text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        已占用
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {activeId ? (
            <div className="px-3 py-2.5 rounded-lg border-2 border-accent bg-accent/20 shadow-xl min-h-[44px]">
              <span className="text-sm font-medium text-accent">
                {String(activeId).replace('source-', '')}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 手动映射模式：选择源字段和目标字段 */}
      <div className="flex items-center gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
        <span className="text-sm text-slate-400">手动映射:</span>
        <select
          className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200"
          value={selectedTarget || ''}
          onChange={(e) => setSelectedTarget(e.target.value || null)}
        >
          <option value="">选择目标字段...</option>
          {STANDARD_TARGET_FIELDS.filter((f) => !Object.values(fieldMappings).includes(f.id)).map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200"
          value=""
          onChange={(e) => handleSelectTarget(e.target.value)}
          disabled={!selectedTarget}
        >
          <option value="">选择源字段...</option>
          {sourceFields
            .filter((f) => !isFieldMapped(f))
            .map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
        </select>

        <button
          className="px-3 py-1.5 text-sm bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedTarget}
          onClick={() => {
            const sourceField = sourceFields.find((f) => !isFieldMapped(f));
            if (sourceField) handleSelectTarget(sourceField);
          }}
        >
          添加
        </button>
      </div>

      {/* 预览结果 */}
      {isPreviewLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>正在预览解析结果...</span>
        </div>
      )}

      {previewResults && previewResults.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">解析预览</label>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
            {previewResults.slice(0, 3).map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded border ${
                  result.success
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? (
                    <span className="text-xs text-emerald-400">解析成功</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      解析失败
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(result.parsed_fields || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-200 font-mono truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
