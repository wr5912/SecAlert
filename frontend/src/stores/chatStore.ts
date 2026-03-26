/**
 * AI 助手对话状态管理 (Zustand)
 *
 * 管理对话状态: 消息列表、当前会话、上下文
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface ChatContext {
  type: 'chain' | 'list' | 'dashboard' | 'global';
  chain_id?: string;
  severity?: string;
  status?: string;
  asset_ip?: string;
  alert_count?: number;
  time_range?: string;
}

interface ChatState {
  // 状态
  messages: ChatMessage[];
  sessionId: string | null;
  context: ChatContext;
  isOpen: boolean;
  isStreaming: boolean;

  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  setContext: (context: ChatContext) => void;
  setSessionId: (sessionId: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string | ((prev: string) => string)) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // 初始状态
      messages: [],
      sessionId: null,
      context: { type: 'global' },
      isOpen: false,
      isStreaming: false,

      // Actions
      openDialog: () => set({ isOpen: true }),
      closeDialog: () => set({ isOpen: false }),

      setContext: (context) => set({ context }),

      setSessionId: (sessionId) => set({ sessionId }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message]
        })),

      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const newContent = typeof content === 'function'
              ? content(lastMessage.content)
              : content;
            messages[messages.length - 1] = {
              ...lastMessage,
              content: newContent
            };
          }
          return { messages };
        }),

      clearMessages: () => set({ messages: [], sessionId: null }),

      setStreaming: (streaming) => set({ isStreaming: streaming }),
    }),
    {
      name: 'secalert-chat-storage',
      partialize: (state) => ({
        // 只持久化会话ID和上下文，不持久化消息（消息由后端管理）
        sessionId: state.sessionId,
        context: state.context
      })
    }
  )
);
