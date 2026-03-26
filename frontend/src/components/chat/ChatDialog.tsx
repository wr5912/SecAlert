/**
 * AI 助手对话框主组件
 *
 * 使用 Radix UI Dialog 包装，提供完整的对话界面
 */

import * as Dialog from '@radix-ui/react-dialog';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

export function ChatDialog() {
  const { isOpen, closeDialog } = useChatStore();

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[32rem] bg-white rounded-lg shadow-xl z-50 flex flex-col">
          <ChatHeader onClose={() => closeDialog()} />
          <ChatMessageList />
          <ChatInput />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// 浮动触发按钮 (放在页面角落)
export function ChatTriggerButton() {
  const { openDialog, isOpen } = useChatStore();

  if (isOpen) return null;

  return (
    <button
      onClick={openDialog}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
      title="打开 AI 助手"
    >
      <MessageSquare className="w-6 h-6" />
    </button>
  );
}
