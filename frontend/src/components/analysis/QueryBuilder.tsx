/**
 * 查询构建器组件
 * 可视化三元组查询构建器（字段 + 操作符 + 值）
 */

import { useState } from 'react';
import type { HuntingQuery } from '../../types/analysis';

// 可选字段
const fields = [
  { value: 'src_ip', label: '源 IP' },
  { value: 'dst_ip', label: '目标 IP' },
  { value: 'user', label: '用户' },
  { value: 'hostname', label: '主机名' },
  { value: 'alert_signature', label: '告警签名' },
  { value: 'mitre_tactic', label: 'MITRE 战术' },
  { value: 'mitre_technique', label: 'MITRE 技术' },
  { value: 'severity', label: '严重级别' },
];

// 操作符
const operators = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: 'contains', label: '包含' },
  { value: 'starts_with', label: '开头是' },
  { value: 'ends_with', label: '结尾是' },
];

// QueryBuilder 属性
export interface QueryBuilderProps {
  onChange?: (query: HuntingQuery) => void;
  onExecute?: () => void;
}

// 单个查询条件
interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export function QueryBuilder({ onChange, onExecute }: QueryBuilderProps) {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { id: '1', field: '', operator: '=', value: '' },
  ]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');

  // 添加条件
  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '=',
      value: '',
    };
    setConditions([...conditions, newCondition]);
  };

  // 移除条件
  const removeCondition = (id: string) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((c) => c.id !== id));
  };

  // 更新条件
  const updateCondition = (id: string, key: keyof QueryCondition, value: string) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  // 通知变化
  const notifyChange = () => {
    const query: HuntingQuery = {
      filters: conditions
        .filter((c) => c.field && c.operator && c.value)
        .map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
      logic,
    };
    onChange?.(query);
  };

  // 处理变化并通知
  const handleChange = (id: string, key: keyof QueryCondition, value: string) => {
    updateCondition(id, key, value);
    // 延迟通知以获取最新状态
    setTimeout(notifyChange, 0);
  };

  // 处理执行
  const handleExecute = () => {
    notifyChange();
    onExecute?.();
  };

  return (
    <div className="space-y-4">
      {/* 查询条件列表 */}
      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="flex gap-2 items-start">
            {/* 逻辑运算符 */}
            {index > 0 && (
              <select
                value={logic}
                onChange={(e) => {
                  setLogic(e.target.value as 'AND' | 'OR');
                  setTimeout(notifyChange, 0);
                }}
                className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            {/* 字段 */}
            <select
              value={condition.field}
              onChange={(e) => handleChange(condition.id, 'field', e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-300"
            >
              <option value="">选择字段</option>
              {fields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* 操作符 */}
            <select
              value={condition.operator}
              onChange={(e) => handleChange(condition.id, 'operator', e.target.value)}
              className="px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-300"
            >
              {operators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            {/* 值 */}
            <input
              type="text"
              value={condition.value}
              onChange={(e) => handleChange(condition.id, 'value', e.target.value)}
              placeholder="值"
              className="flex-1 px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-300 placeholder-slate-500"
            />

            {/* 删除按钮 */}
            {conditions.length > 1 && (
              <button
                onClick={() => removeCondition(condition.id)}
                className="px-2 py-1.5 text-slate-400 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 添加条件按钮 */}
      <button
        onClick={addCondition}
        className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 border border-dashed border-slate-700 rounded hover:border-slate-600 transition-colors"
      >
        + 添加条件
      </button>

      {/* 执行按钮 */}
      <button
        onClick={handleExecute}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded transition-colors"
      >
        执行查询
      </button>
    </div>
  );
}

export default QueryBuilder;
