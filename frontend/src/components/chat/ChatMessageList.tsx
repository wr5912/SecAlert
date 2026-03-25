/**
 * 消息列表组件
 *
 * 使用 @radix-ui/react-scroll-area 实现平滑滚动
 */

import React, { useRef, useEffect } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessage } from './ChatMessage';

export function ChatMessageList() {
  const { messages } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea.Root className="flex-1 overflow-hidden">
      <ScrollArea.Viewport className="h-full w-full px-4 py-2">
        <div className="space-y-4">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-2">欢迎使用 SecAlert AI 助手</p>
              <p className="text-sm text-slate-400">
                我可以帮助您理解和处置安全告警。请先选择一个告警或告警列表。
              </p>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="w-2 border-l border-slate-200 bg-slate-100"
      >
        <ScrollArea.Thumb className="bg-slate-300 rounded" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
