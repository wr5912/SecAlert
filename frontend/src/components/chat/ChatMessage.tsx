/**
 * 单条消息组件
 */

import React from 'react';
import { User, Bot } from 'lucide-react';
import { filterSensitiveInfo } from '../../api/chat';
import type { ChatMessage as ChatMessageType } from '../../stores/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-slate-200' : 'bg-blue-100'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-slate-600" />
        ) : (
          <Bot className="w-4 h-4 text-blue-600" />
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">
          {isUser ? message.content : filterSensitiveInfo(message.content)}
        </p>
      </div>
    </div>
  );
}
