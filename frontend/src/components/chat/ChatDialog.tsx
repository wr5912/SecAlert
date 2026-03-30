/**
 * AI 助手对话框主组件
 *
 * 右侧固定侧边栏式对话框，点击浮动按钮展开/收起
 */

import { MessageSquare, X } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

export function ChatDialog() {
  const { isOpen, closeDialog } = useChatStore();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 w-96 h-[32rem] bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* 头部 */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-slate-200">AI 调查助手</h2>
        </div>
        <button
          onClick={closeDialog}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 消息列表 */}
      <ChatMessageList />

      {/* 输入框 */}
      <ChatInput />
    </div>
  );
}

// 浮动触发按钮 (放在页面右下角)
export function ChatTriggerButton() {
  const { openDialog, isOpen } = useChatStore();

  return (
    <button
      onClick={openDialog}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
      title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
    >
      <MessageSquare className="w-6 h-6" />
    </button>
  );
}
