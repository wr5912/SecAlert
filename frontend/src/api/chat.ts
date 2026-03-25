/**
 * AI 助手对话 API 客户端
 *
 * 提供:
 * - createSession - 创建新会话
 * - streamChat - 流式对话
 * - getChatHistory - 获取历史消息
 */

import type { ChatContext, ChatMessage } from '../stores/chatStore';

const API_BASE = '/api/chat';

interface CreateSessionResponse {
  session_id: string;
  context_type: string;
}

interface HistoryResponse {
  session_id: string;
  messages: ChatMessage[];
}

interface StreamChunk {
  token?: string;
  type: 'chunk' | 'done' | 'error';
}

/**
 * 创建新对话会话
 */
export async function createSession(
  contextType: string = 'global',
  contextEntityId?: string
): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context_type: contextType,
      context_entity_id: contextEntityId
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取对话历史
 */
export async function getChatHistory(
  sessionId: string,
  limit: number = 20
): Promise<HistoryResponse> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/history?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 流式对话
 *
 * 使用 SSE (Server-Sent Events) 获取流式响应
 *
 * @param message - 用户消息
 * @param sessionId - 会话ID
 * @param context - 当前上下文
 * @param onChunk - 每个chunk的回调
 * @param onDone - 完成时的回调
 * @param onError - 错误时的回调
 */
export async function streamChat(
  message: string,
  sessionId: string,
  context: ChatContext,
  onChunk: (token: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        context
      })
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        try {
          const data: StreamChunk = JSON.parse(line.slice(6));

          if (data.type === 'chunk' && data.token) {
            onChunk(data.token);
          } else if (data.type === 'done') {
            onDone();
          } else if (data.type === 'error') {
            onError(new Error(data.token || 'Unknown error'));
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 过滤敏感信息 (AI输出防护)
 *
 * 将内网IP替换为 [内网IP]
 */
export function filterSensitiveInfo(text: string): string {
  return text
    .replace(/10\.\d+\.\d+\.\d+/g, '[内网IP]')
    .replace(/192\.168\.\d+\.\d+/g, '[内网IP]')
    .replace(/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/g, '[内网IP]');
}
