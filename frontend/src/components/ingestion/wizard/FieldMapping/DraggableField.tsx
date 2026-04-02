/**
 * 可拖拽字段项组件
 * 支持拖拽式字段映射 UI
 *
 * 状态:
 * - default: 默认状态，灰色边框
 * - dragging: 拖拽中，accent 边框 + 放大效果
 * - mapped: 已映射，success 色勾选标记
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check } from 'lucide-react';

interface DraggableFieldProps {
  id: string;
  name: string;
  type: 'source' | 'target';
  isMapped?: boolean;
}

export function DraggableField({ id, name, type, isMapped = false }: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type, field: { id, name, type, isMapped } },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 状态样式
  const getStateStyles = () => {
    if (isDragging) {
      return 'border-accent bg-accent/20 scale-105 shadow-lg shadow-accent/20';
    }
    if (isMapped) {
      return 'border-emerald-500/50 bg-emerald-500/10';
    }
    return 'border-slate-600 bg-slate-800/50 hover:border-slate-400';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border-2 cursor-grab active:cursor-grabbing
        min-h-[44px] transition-all duration-150 select-none
        ${getStateStyles()}
      `}
    >
      <span className="text-sm font-medium text-slate-200 truncate">{name}</span>

      {/* 已映射状态显示勾选标记 */}
      {isMapped && (
        <div className="flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-400" />
          </div>
        </div>
      )}

      {/* 拖拽手柄指示 */}
      {type === 'source' && !isMapped && (
        <div className="flex-shrink-0 opacity-40">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="3" cy="3" r="1" fill="currentColor" />
            <circle cx="9" cy="3" r="1" fill="currentColor" />
            <circle cx="3" cy="9" r="1" fill="currentColor" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
