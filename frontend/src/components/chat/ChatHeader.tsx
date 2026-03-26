/**
 * AI 助手对话框头部
 */

import { X, Bot } from 'lucide-react';
import { ContextIndicator } from './ContextIndicator';
import { useChatStore } from '../../stores/chatStore';

interface ChatHeaderProps {
  onClose: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  const { context } = useChatStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">SecAlert AI 助手</h2>
          <ContextIndicator context={context} />
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
