/**
 * 对话输入框组件
 */

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { createSession, streamChat, filterSensitiveInfo } from '../../api/chat';

export function ChatInput() {
  const [input, setInput] = useState('');
  const {
    sessionId,
    context,
    isStreaming,
    setSessionId,
    addMessage,
    updateLastMessage,
    setStreaming
  } = useChatStore();

  async function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // 添加用户消息
    addMessage({ role: 'user', content: userMessage });

    // 确保有会话ID
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const response = await createSession(context.type, context.chain_id);
        currentSessionId = response.session_id;
        setSessionId(currentSessionId);
      } catch (e) {
        console.error('Failed to create session:', e);
        addMessage({
          role: 'assistant',
          content: '创建会话失败，请重试。'
        });
        return;
      }
    }

    // 添加空助手消息占位
    addMessage({ role: 'assistant', content: '' });
    setStreaming(true);

    // 流式获取响应
    await streamChat(
      userMessage,
      currentSessionId,
      context,
      // onChunk
      (token) => {
        updateLastMessage((prev: string) => filterSensitiveInfo(prev + token));
      },
      // onDone
      () => {
        setStreaming(false);
      },
      // onError
      (error) => {
        updateLastMessage((prev: string) => prev + `\n\n[错误: ${error.message}]`);
        setStreaming(false);
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="px-4 py-3 border-t border-slate-200">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题..."
          rows={1}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg transition-colors"
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </div>
  );
}
