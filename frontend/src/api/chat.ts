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

// 是否使用模拟模式（后端未运行时）
const USE_MOCK = false;

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
  // 模拟模式
  if (USE_MOCK) {
    return {
      session_id: 'mock-session-' + Date.now(),
      context_type: contextType
    };
  }

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
  // 模拟模式
  if (USE_MOCK) {
    const mockResponses: Record<string, string> = {
      'chain': `根据当前选中的攻击链，我为您分析如下：

**攻击链详情**
- 攻击阶段: 初始访问 → 执行 → 持久化
- 目标资产: 192.168.1.100
- 严重度: High
- 置信度: 85%

**建议的处置步骤**
1. 隔离受影响的服务器
2. 检查是否存在异常进程
3. 查看系统日志确认入侵时间点
4. 联系安全团队进行深入调查`,

      'list': `当前告警列表中有 **23** 条活跃告警，其中：

**严重告警 (Critical)**: 3 条
- 192.168.1.100: 疑似暴力破解
- 10.0.0.50: Webshell 上传检测

**高危告警 (High)**: 8 条
- 主要为异常登录和端口扫描行为

建议先处理 Critical 级别的告警。`,

      'dashboard': `当前仪表盘显示：

**安全态势概览**
- 活跃告警: 23 条
- 待处理: 15 条
- 已抑制: 8 条

**最近 24 小时趋势**
- 告警数量较昨日下降 12%
- 未发现新的严重威胁

建议关注近期内多次触发的告警。`,

      'global': `您好！我是 SecAlert AI 助手。

我可以帮您：
- 查询和分析安全告警
- 解释攻击链详情
- 提供处置建议

请选择一个告警或告诉我您想了解什么？`
    };

    const response = mockResponses[context.type] || mockResponses['global'];

    // 模拟流式输出
    const chunks = response.match(/.{1,5}/g) || [response];
    let delay = 20;
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay + 5, 50); // 逐渐增加延迟
      onChunk(chunk);
    }
    onDone();
    return;
  }

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

/**
 * WebSocket 流式对话
 *
 * 使用 WebSocket 获取 Agent 流式响应
 *
 * @param message - 用户消息
 * @param sessionId - 会话ID (作为 user_id)
 * @param context - 当前上下文
 * @param onChunk - 每个 chunk 的回调
 * @param onDone - 完成时的回调
 * @param onError - 错误时的回调
 * @returns WebSocket 连接，可用于关闭
 */
export function streamChatWebSocket(
  message: string,
  sessionId: string,
  context: ChatContext,
  onChunk: (token: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws/chat/${sessionId}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // 发送消息
    ws.send(JSON.stringify({
      message,
      context
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const msgType = data.type;
      const content = data.content || '';

      if (msgType === 'text') {
        onChunk(content);
      } else if (msgType === 'tool_use') {
        // 工具执行中，可选显示
        onChunk(content);
      } else if (msgType === 'done') {
        onDone();
      } else if (msgType === 'error') {
        onError(new Error(content || 'Unknown error'));
      }
    } catch (e) {
      // 忽略解析错误
    }
  };

  ws.onerror = (_event) => {
    onError(new Error('WebSocket connection error'));
  };

  ws.onclose = () => {
    // 连接关闭时调用 onDone
    onDone();
  };

  return ws;
}
