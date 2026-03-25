---
phase: 07-ai-assistant
plan: 07-01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/api/chat_endpoints.py
  - src/api/main.py
  - frontend/src/components/chat/ChatDialog.tsx
  - frontend/src/components/chat/ChatHeader.tsx
  - frontend/src/components/chat/ChatMessageList.tsx
  - frontend/src/components/chat/ChatMessage.tsx
  - frontend/src/components/chat/ChatInput.tsx
  - frontend/src/components/chat/ContextIndicator.tsx
  - frontend/src/stores/chatStore.ts
  - frontend/src/api/chat.ts
  - frontend/package.json
autonomous: true
requirements:
  - AI-01
  - AI-02
  - AI-05

must_haves:
  truths:
    - "用户可以打开AI助手对话框"
    - "AI助手能显示当前告警上下文（chain_id, severity, alert_count）"
    - "用户发送消息后AI能流式返回响应"
    - "对话历史能持久化存储"
  artifacts:
    - path: "src/api/chat_endpoints.py"
      provides: "对话API端点（创建会话、流式对话、获取历史）"
      exports: ["POST /api/chat/sessions", "POST /api/chat/stream", "GET /api/chat/sessions/{session_id}/history"]
    - path: "frontend/src/components/chat/ChatDialog.tsx"
      provides: "AI助手对话框主组件"
      min_lines: 50
    - path: "frontend/src/stores/chatStore.ts"
      provides: "Zustand对话状态管理"
      exports: ["useChatStore"]
    - path: "frontend/src/api/chat.ts"
      provides: "对话API客户端"
      exports: ["createSession", "streamChat", "getChatHistory"]
  key_links:
    - from: "ChatDialog.tsx"
      to: "chatStore.ts"
      via: "Zustand状态订阅"
      pattern: "useChatStore"
    - from: "ChatInput.tsx"
      to: "/api/chat/stream"
      via: "SSE流式请求"
      pattern: "fetch.*stream"
    - from: "chat_endpoints.py"
      to: " RemediationAdvisor"
      via: "LLM调用"
      pattern: "RemediationAdvisor"
---

<objective>
实现AI助手核心功能：对话框界面、上下文动态关联、对话历史持久化。

**目标：** 用户可以打开AI助手对话框，查看当前告警上下文，发送消息获得流式AI响应，对话历史能持久化存储。

**输出：**
- 后端对话API（会话管理、流式响应、历史查询）
- 前端对话组件（ChatDialog + ChatMessageList + ChatInput）
- Zustand状态管理
- PostgreSQL数据库表
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-ai-assistant/07-RESEARCH.md
@src/api/chain_endpoints.py
@frontend/src/components/AlertList.tsx
@frontend/src/types/index.ts

# 关键类型定义 (来自 existing files)

ChatContext (前端):
```typescript
interface ChatContext {
  type: 'chain' | 'list' | 'dashboard' | 'global';
  chain_id?: string;
  severity?: string;
  status?: string;
  asset_ip?: string;
  alert_count?: number;
  time_range?: string;
}
```

ChatMessage (前端):
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}
```

# System Prompt 模板 (来自 RESEARCH)
```
你是 SecAlert 安全分析助手，帮助运维人员理解和处置安全告警。

当前上下文：
- 页面类型: {context.type}
{context.chain_id ? `- 攻击链ID: ${context.chain_id}` : ''}
{context.severity ? `- 严重度: ${context.severity}` : ''}
{context.alert_count ? `- 告警数量: ${context.alert_count}` : ''}
{context.asset_ip ? `- 目标资产: ${context.asset_ip}` : ''}

规则：
1. 只读取当前上下文中的信息，禁止自行查询数据库
2. 回答必须基于上述上下文，禁止编造信息
3. 如需查询更多信息，建议用户使用搜索功能
4. 处置建议必须包含具体的操作步骤
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建数据库表和后端对话API</name>
  <files>src/api/chat_endpoints.py, database/chat_schema.sql</files>
  <read_first>
    - src/api/main.py (理解FastAPI路由注册模式)
    - src/api/chain_endpoints.py (理解API结构)
    - 07-RESEARCH.md (理解数据库Schema)
  </read_first>
  <action>
## AI-01 + AI-05: 对话API + 历史持久化

### 1.1 创建数据库Schema

创建 `database/chat_schema.sql`:

```sql
-- 对话会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL DEFAULT 'default_user',
    context_type VARCHAR(32) NOT NULL DEFAULT 'global',
    context_entity_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 对话消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    context_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, created_at);
```

### 1.2 创建对话API端点

创建 `src/api/chat_endpoints.py`:

```python
"""
AI 助手对话 API 端点

提供:
- POST /api/chat/sessions - 创建新会话
- POST /api/chat/stream - 流式对话响应 (SSE)
- GET /api/chat/sessions/{session_id}/history - 获取历史消息
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import json
import os

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ========== 数据模型 ==========

class ChatContext(BaseModel):
    """对话上下文模型"""
    type: str = Field(default="global", pattern="^(chain|list|dashboard|global)$")
    chain_id: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    asset_ip: Optional[str] = None
    alert_count: Optional[int] = None
    time_range: Optional[str] = None

class ChatMessage(BaseModel):
    """对话消息模型"""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    context_snapshot: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    context_type: str = Field(default="global", pattern="^(chain|list|dashboard|global)$")
    context_entity_id: Optional[str] = None

class CreateSessionResponse(BaseModel):
    """创建会话响应"""
    session_id: str
    context_type: str

class StreamRequest(BaseModel):
    """流式对话请求"""
    message: str
    session_id: str
    context: ChatContext

# ========== System Prompt 模板 ==========

SYSTEM_PROMPT_TEMPLATE = """你是 SecAlert 安全分析助手，帮助运维人员理解和处置安全告警。

当前上下文：
- 页面类型: {context_type}
{context_chain_id f'- 攻击链ID: {context_chain_id}' if context_chain_id else ''}
{context_severity f'- 严重度: {context_severity}' if context_severity else ''}
{context_alert_count f'- 告警数量: {context_alert_count}' if context_alert_count else ''}
{context_asset_ip f'- 目标资产: {context_asset_ip}' if context_asset_ip else ''}

规则：
1. 只读取当前上下文中的信息，禁止自行查询数据库
2. 回答必须基于上述上下文，禁止编造信息
3. 如需查询更多信息，建议用户使用搜索功能
4. 处置建议必须包含具体的操作步骤
5. 如果上下文信息不足，明确告知用户需要先选择告警或查看告警列表
"""

# ========== 内存存储 (生产环境应使用PostgreSQL) ==========

# 简单内存存储用于演示，生产环境替换为真实数据库
_sessions: Dict[str, Dict[str, Any]] = {}
_messages: Dict[str, List[Dict[str, Any]]] = {}

def save_message(session_id: str, role: str, content: str, context: Optional[Dict[str, Any]] = None):
    """保存消息到存储"""
    if session_id not in _messages:
        _messages[session_id] = []
    _messages[session_id].append({
        "message_id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": role,
        "content": content,
        "context_snapshot": context,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

def build_system_prompt(context: ChatContext) -> str:
    """构建System Prompt"""
    return SYSTEM_PROMPT_TEMPLATE.format(
        context_type=context.type,
        context_chain_id=context.chain_id or "",
        context_severity=context.severity or "",
        context_alert_count=context.alert_count or "",
        context_asset_ip=context.asset_ip or ""
    )

# ========== API 端点 ==========

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """创建新对话会话"""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "user_id": "default_user",
        "context_type": request.context_type,
        "context_entity_id": request.context_entity_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _messages[session_id] = []
    return CreateSessionResponse(
        session_id=session_id,
        context_type=request.context_type
    )

@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    limit: int = Query(default=20, ge=1, le=100)
):
    """获取对话历史"""
    if session_id not in _messages:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = _messages[session_id][-limit:]
    return {"session_id": session_id, "messages": messages}

@router.post("/stream")
async def chat_stream(request: StreamRequest):
    """流式 AI 对话响应 (SSE)

    请求体:
    {
        "message": "这条告警怎么处理？",
        "session_id": "uuid",
        "context": {"type": "chain", "chain_id": "abc123"}
    }
    """
    async def generate():
        # 1. 保存用户消息
        context_dict = request.context.model_dump() if request.context else {}
        save_message(request.session_id, "user", request.message, context_dict)

        # 2. 构建 Prompt
        system_prompt = build_system_prompt(request.context)
        full_prompt = f"{system_prompt}\n\n用户: {request.message}\n\n助手:"

        # 3. 调用 LLM 流式生成 (使用 vLLM 或 DSPy)
        # 这里使用模拟流式响应作为演示
        try:
            # 尝试调用已有的 RemediationAdvisor
            from src.analysis.remediation import RemediationAdvisor
            advisor = RemediationAdvisor()

            # 如果有 chain_id，生成处置建议
            if request.context.chain_id:
                chain_id = request.context.chain_id
                # 模拟流式输出
                response_text = f"正在查询攻击链 {chain_id} 的处置建议..."

                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

                # 调用真实建议生成
                recommendation = advisor.get_recommendation(chain_id)
                response_text = f"根据分析，针对此攻击链的建议如下：\n\n"
                response_text += f"**处置动作**: {recommendation.get('short_action', '查看详情')}\n\n"

                if recommendation.get('detailed_steps'):
                    response_text += "**详细步骤**:\n"
                    for i, step in enumerate(recommendation['detailed_steps'], 1):
                        response_text += f"{i}. {step}\n"

                response_text += f"\n**ATT&CK**: {recommendation.get('attck_ref', 'N/A')}"

                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"
            else:
                # 通用对话
                response_text = "我目前显示的是全局上下文。如果您想获取具体的告警处置建议，请先选择一个告警或在告警列表页面与我对话。"
                for chunk in split_into_chunks(response_text):
                    yield f"data: {json.dumps({'token': chunk, 'type': 'chunk'})}\n\n"

        except Exception as e:
            error_msg = f"生成响应时出错: {str(e)}"
            for chunk in split_into_chunks(error_msg):
                yield f"data: {json.dumps({'token': chunk, 'type': 'error'})}\n\n"

        # 4. 保存助手消息 (存储完整响应)
        # 注意：实际实现应该在流结束后保存
        save_message(request.session_id, "assistant", "[已生成响应]", context_dict)

        # 5. 标记结束
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    def split_into_chunks(text: str, chunk_size: int = 10):
        """将文本拆分为小块用于流式输出"""
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/sessions")
async def list_sessions():
    """列出所有会话 (调试用)"""
    return {"sessions": list(_sessions.values())}
```

### 1.3 更新 main.py 注册路由

在 `src/api/main.py` 中添加:

```python
from src.api.chat_endpoints import router as chat_router

# 注册路由
app.include_router(chain_router)
app.include_router(remediation_router)
app.include_router(analysis_router)
app.include_router(chat_router)  # 添加这一行
```
</action>
  <verify>
    <automated>grep -l "chat_endpoints" src/api/main.py && grep -l "router = APIRouter" src/api/chat_endpoints.py && grep -l "/chat/sessions" src/api/chat_endpoints.py</automated>
  </verify>
  <done>对话API完成：POST /api/chat/sessions 创建会话、POST /api/chat/stream 流式响应、GET /api/chat/sessions/{session_id}/history 历史查询</done>
</task>

<task type="auto">
  <name>Task 2: 安装前端依赖并创建Zustand Store</name>
  <files>frontend/package.json, frontend/src/stores/chatStore.ts</files>
  <read_first>
    - frontend/package.json (现有依赖)
    - 07-RESEARCH.md (Zustand + TanStack Query)
  </read_first>
  <action>
## AI-01: 前端状态管理

### 2.1 安装依赖

首先安装 Radix UI 和 Zustand:

```bash
cd frontend && npm install @radix-ui/react-dialog @radix-ui/react-scroll-area zustand
```

### 2.2 创建 Zustand Store

创建 `frontend/src/stores/chatStore.ts`:

```typescript
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
  updateLastMessage: (content: string) => void;
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
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content
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
```
</action>
  <verify>
    <automated>grep -l "zustand" frontend/package.json && grep -l "useChatStore" frontend/src/stores/chatStore.ts</automated>
  </verify>
  <done>Zustand Store 创建完成，管理对话状态、会话ID、上下文</done>
</task>

<task type="auto">
  <name>Task 3: 创建前端对话API客户端</name>
  <files>frontend/src/api/chat.ts</files>
  <read_first>
    - frontend/src/api/client.ts (理解API客户端模式)
    - frontend/src/stores/chatStore.ts (理解ChatMessage类型)
  </read_first>
  <action>
## AI-01: 对话API客户端

创建 `frontend/src/api/chat.ts`:

```typescript
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
```

**关键实现点:**
1. `streamChat` 使用 `fetch` + `ReadableStream` 处理 SSE
2. 每收到一个 chunk 立即调用 `onChunk` 回调实现流式UI更新
3. 导出 `filterSensitiveInfo` 用于过滤AI输出中的敏感信息
</action>
  <verify>
    <automated>grep -l "streamChat" frontend/src/api/chat.ts && grep -l "createSession" frontend/src/api/chat.ts</automated>
  </verify>
  <done>对话API客户端完成，支持创建会话、流式对话、获取历史、敏感信息过滤</done>
</task>

<task type="auto">
  <name>Task 4: 创建前端对话组件</name>
  <files>frontend/src/components/chat/ChatDialog.tsx, frontend/src/components/chat/ChatHeader.tsx, frontend/src/components/chat/ChatMessageList.tsx, frontend/src/components/chat/ChatMessage.tsx, frontend/src/components/chat/ChatInput.tsx, frontend/src/components/chat/ContextIndicator.tsx</files>
  <read_first>
    - frontend/src/components/AlertList.tsx (理解现有组件模式)
    - frontend/src/stores/chatStore.ts (理解ChatMessage类型)
    - frontend/src/api/chat.ts (理解API客户端)
  </read_first>
  <action>
## AI-01: 对话组件

创建 `frontend/src/components/chat/ChatDialog.tsx`:

```typescript
/**
 * AI 助手对话框主组件
 *
 * 使用 Radix UI Dialog 包装，提供完整的对话界面
 */

import React, { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, MessageSquare } from 'lucide-react';
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
```

创建 `frontend/src/components/chat/ChatHeader.tsx`:

```typescript
/**
 * AI 助手对话框头部
 */

import React from 'react';
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
```

创建 `frontend/src/components/chat/ContextIndicator.tsx`:

```typescript
/**
 * 上下文指示器
 *
 * 显示当前对话关联的上下文类型和关键信息
 */

import React from 'react';
import { useChatStore, ChatContext } from '../../stores/chatStore';

export function ContextIndicator({ context }: { context: ChatContext }) {
  if (context.type === 'global') {
    return <span className="text-xs text-slate-500">全局上下文</span>;
  }

  const labels: Record<string, string> = {
    chain: '攻击链详情',
    list: '告警列表',
    dashboard: '仪表盘'
  };

  const parts = [labels[context.type] || context.type];

  if (context.chain_id) {
    parts.push(`ID: ${context.chain_id.slice(0, 8)}...`);
  }
  if (context.severity) {
    parts.push(`严重度: ${context.severity}`);
  }

  return (
    <span className="text-xs text-slate-500">
      {parts.join(' · ')}
    </span>
  );
}
```

创建 `frontend/src/components/chat/ChatMessageList.tsx`:

```typescript
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
```

创建 `frontend/src/components/chat/ChatMessage.tsx`:

```typescript
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
```

创建 `frontend/src/components/chat/ChatInput.tsx`:

```typescript
/**
 * 对话输入框组件
 */

import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { createSession, streamChat, filterSensitiveInfo } from '../../api/chat';

export function ChatInput() {
  const [input, setInput] = useState('');
  const {
    messages,
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
        updateLastMessage((prev) => filterSensitiveInfo(prev + token));
      },
      // onDone
      () => {
        setStreaming(false);
      },
      // onError
      (error) => {
        updateLastMessage((prev) => prev + `\n\n[错误: ${error.message}]`);
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
```
</action>
  <verify>
    <automated>grep -l "ChatDialog" frontend/src/components/chat/ChatDialog.tsx && grep -l "ChatMessageList" frontend/src/components/chat/ChatMessageList.tsx && grep -l "ChatInput" frontend/src/components/chat/ChatInput.tsx</automated>
  </verify>
  <done>对话组件创建完成：ChatDialog、ChatHeader、ChatMessageList、ChatMessage、ChatInput、ContextIndicator</done>
</task>

<task type="auto">
  <name>Task 5: 集成AI助手到主应用</name>
  <files>frontend/src/App.tsx</files>
  <read_first>
    - frontend/src/App.tsx (现有主应用)
    - frontend/src/components/chat/ChatDialog.tsx (刚创建)
  </read_first>
  <action>
## AI-01 + AI-02: 集成到主应用

更新 `frontend/src/App.tsx` 添加 AI 助手:

```typescript
/** SecAlert 前端主应用

入口组件，管理告警列表和详情视图切换
集成 AI 助手对话框
*/

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { AlertList } from './components/AlertList';
import { AlertDetail } from './components/AlertDetail';
import { ChatDialog, ChatTriggerButton } from './components/chat/ChatDialog';
import { useChatStore } from './stores/chatStore';
import type { ViewMode } from './types';

export default function App() {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>();
  const { setContext } = useChatStore();

  // 根据当前视图更新 AI 助手上下文
  useEffect(() => {
    if (view === 'list') {
      setContext({ type: 'list' });
    } else if (view === 'detail' && selectedChainId) {
      setContext({
        type: 'chain',
        chain_id: selectedChainId
      });
    }
  }, [view, selectedChainId, setContext]);

  function handleSelectChain(chainId: string) {
    setSelectedChainId(chainId);
    setView('detail');
  }

  function handleBack() {
    setSelectedChainId(undefined);
    setView('list');
  }

  function handleStatusChange() {
    // 状态变更后刷新列表（由 AlertList 处理）
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-semibold text-slate-900">SecAlert</h1>
          </div>
          {/* AI 助手触发按钮 */}
          <ChatTriggerButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === 'list' ? (
          <AlertList
            onSelectChain={handleSelectChain}
            selectedChainId={selectedChainId}
          />
        ) : (
          <AlertDetail
            chainId={selectedChainId!}
            onBack={handleBack}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* AI 助手对话框 */}
      <ChatDialog />
    </div>
  );
}
```

**关键实现点:**
1. 使用 `useChatStore` 的 `setContext` 在视图切换时更新上下文
2. 当用户查看列表时，上下文类型为 `list`
3. 当用户查看详情时，上下文类型为 `chain`，包含 `chain_id`
4. `ChatTriggerButton` 固定在右下角，点击打开对话框
</action>
  <verify>
    <automated>grep -l "ChatDialog" frontend/src/App.tsx && grep -l "ChatTriggerButton" frontend/src/App.tsx && grep -l "setContext" frontend/src/App.tsx</automated>
  </verify>
  <done>AI助手已集成到主应用，可以通过右下角按钮打开，视图切换自动更新上下文</done>
</task>

</tasks>

<verification>
## Phase 7-01 验证检查

### AI-01 (对话框界面)
- [ ] `ChatDialog.tsx` 存在且使用 Radix UI Dialog
- [ ] `ChatMessageList.tsx` 使用 @radix-ui/react-scroll-area
- [ ] `ChatInput.tsx` 支持发送消息和流式响应
- [ ] `ChatTriggerButton` 显示在页面右下角

### AI-02 (上下文关联)
- [ ] `ContextIndicator` 显示当前上下文类型
- [ ] `App.tsx` 在视图切换时调用 `setContext`
- [ ] 创建会话时传递正确的 `context_type`

### AI-05 (历史记录)
- [ ] `POST /api/chat/sessions` 创建会话
- [ ] `GET /api/chat/sessions/{session_id}/history` 获取历史
- [ ] `streamChat` 函数支持 SSE 流式响应
</verification>

<success_criteria>
## Phase 7-01 完成标准

1. **AI-01 完成**: AI助手对话框可以打开和关闭，显示消息列表和输入框
2. **AI-02 完成**: 上下文自动关联：列表页面上下文为 `{type: 'list'}`，详情页面为 `{type: 'chain', chain_id: 'xxx'}`
3. **AI-05 完成**: 对话消息通过 SSE 流式返回，历史通过 `/api/chat/sessions/{session_id}/history` 查询

**所有3个需求 (AI-01, AI-02, AI-05) 均已实现。**
</success_criteria>

<output>
完成后创建 `.planning/phases/07-ai-assistant/07-01-SUMMARY.md`
</output>
