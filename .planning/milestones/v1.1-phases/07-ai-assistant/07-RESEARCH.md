# Phase 7: AI 助手 - Research

**研究日期:** 2026-03-25
**Domain:** 前端 AI 对话界面 + 后端对话上下文管理
**Confidence:** MEDIUM（基于现有系统架构分析和 React/FastAPI 标准模式推断）

---

## 摘要

Phase 7 需要为 SecAlert 实现 AI 助手对话框，支持：
1. 告警上下文动态关联（当前页面状态注入对话）
2. 自然语言查询告警（NL 理解 + API 调用）
3. AI 处理建议自然语言生成
4. 对话历史记录持久化

**核心约束：**
- AI 推理基于私有化 Qwen3-32B（无外部云依赖）
- 上下文必须过滤安全敏感信息（Pitfall 2: 上下文泄露防护）
- Token 窗口限制 32K，需上下文压缩策略（Pitfall 3: 上下文膨胀）

---

## 标准技术栈

### 前端对话组件

| 库/技术 | 版本 | 用途 | 推荐度 |
|---------|------|------|--------|
| **Radix UI Dialog** | ^1.0.5 | 对话框基础组件 | **首选** - 无样式绑定，完全可控 |
| **@radix-ui/react-scroll-area** | ^1.0.5 | 消息列表滚动区域 | 必需 - 平滑滚动 |
| **Zustand** | ^4.5.0 | 对话状态管理 | 必需 - 轻量级状态管理 |
| **TanStack Query** | ^5.28.0 | SSE 流式数据获取 | 必需 - 流式响应处理 |

**安装命令:**
```bash
cd frontend && npm install @radix-ui/react-dialog @radix-ui/react-scroll-area zustand @tanstack/react-query
```

### 后端对话 API

| 库/技术 | 版本 | 用途 | 推荐度 |
|---------|------|------|--------|
| **FastAPI StreamingResponse** | ^0.110.0 | SSE 流式响应 | **首选** - 原生支持 |
| **FastAPI WebSocket** | 内置 | 双向通信备选 | 备选 - 复杂度更高 |
| **PostgreSQL** | 已有 | 对话历史存储 | 必需 |
| **Redis** | 已有 | 会话缓存 | 推荐 - 减少 DB 查询 |

### 对话历史存储方案

| 方案 | 适用场景 | 推荐度 | 说明 |
|------|----------|--------|------|
| **PostgreSQL JSONB** | 短期会话 (< 100 条) | **首选** | 简单，与现有系统一致 |
| **向量数据库 (Milvus/Pgvector)** | 语义检索历史 | 备选 | v1.1 可不加，未来需求 |
| **Elasticsearch** | 大规模日志关联 | 不推荐 | 过度设计 |

**推荐会话 Schema:**
```sql
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,  -- 运维人员 ID
    context_type VARCHAR(32) NOT NULL,  -- 'chain' | 'list' | 'dashboard'
    context_entity_id VARCHAR(128),  -- chain_id 等
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(session_id),
    role VARCHAR(16) NOT NULL,  -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    context_snapshot JSONB,  -- 发送时的上下文快照
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at);
```

---

## 架构设计

### 前端组件结构

```
frontend/src/
├── components/
│   └── chat/
│       ├── ChatDialog.tsx        # Radix Dialog 包装
│       ├── ChatHeader.tsx        # 对话标题 + 上下文指示器
│       ├── ChatMessageList.tsx   # 消息列表 (ScrollArea)
│       ├── ChatMessage.tsx       # 单条消息 (用户/AI 区分)
│       ├── ChatInput.tsx         # 输入框 + 发送
│       ├── ContextIndicator.tsx # 当前上下文显示
│       └── useChatStream.ts      # SSE 流式获取 Hook
├── stores/
│   └── chatStore.ts              # Zustand 对话状态
└── api/
    └── chat.ts                   # 对话 API 客户端
```

### 上下文动态关联设计

**关键原则（Pitfall 2 & 3 防护）:**

```typescript
// 上下文类型 - 仅注入必要信息，禁止原始日志
interface ChatContext {
  type: 'chain' | 'list' | 'dashboard' | 'global';
  chain_id?: string;
  severity?: string;
  status?: string;
  asset_ip?: string;      // 已脱敏的资产标识
  alert_count?: number;
  time_range?: string;
  // 禁止字段: raw_log, 内网 IP 细节
}

// System Prompt 模板
const SYSTEM_PROMPT = `你是 SecAlert 安全分析助手，帮助运维人员理解和处置安全告警。

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
4. 处置建议必须包含具体的操作步骤`;
```

### 后端 API 设计

```python
# /api/chat/chat_endpoints.py

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from typing import Optional, List, Dict, Any
import json
import uuid

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ========== 会话管理 ==========

@router.post("/sessions")
async def create_session(
    context_type: str = Query(..., regex="^(chain|list|dashboard|global)$"),
    context_entity_id: Optional[str] = None
) -> Dict[str, Any]:
    """创建新对话会话"""
    session_id = str(uuid.uuid4())
    # 存储到 PostgreSQL
    return {"session_id": session_id, "context_type": context_type}

@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    limit: int = Query(default=20, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """获取对话历史"""
    # 从 PostgreSQL 读取
    messages = db.query(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
        session_id, limit
    )
    return messages

# ========== 流式对话 ==========

@router.post("/stream")
async def chat_stream(
    message: str,
    session_id: str,
    context: Dict[str, Any]  # ChatContext
) -> StreamingResponse:
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
        save_message(session_id, "user", message, context)

        # 2. 构建 Prompt (注入上下文)
        prompt = build_prompt(message, context)

        # 3. 调用 DSPy/Qwen3-32B 流式生成
        async for token in llm.stream_generate(prompt):
            yield f"data: {json.dumps({'token': token, 'type': 'chunk'})}\n\n"

        # 4. 标记结束
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"}
    )
```

### 自然语言查询实现方案

**方案选择: LLM 意图识别 + API 调用（而非 NL2SQL）**

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **NL2SQL** | 灵活查询任意数据 | SQL 注入风险、权限控制复杂 | 不推荐 |
| **LLM 意图识别 + API** | 安全、可控、可解释 | 需要定义 API 粒度 | **首选** |

**意图识别 + API 映射:**

```python
# 预定义可执行意图
INTENT_PATTERNS = [
    {
        "intent": "query_alerts",
        "patterns": ["查询告警", "有哪些告警", "show me alerts"],
        "api": "/api/chains",
        "params_extractor": extract_filter_params  # 从 NL 提取 severity/time range
    },
    {
        "intent": "explain_chain",
        "patterns": ["解释这个", "攻击链是什么", "what happened"],
        "api": "/api/chains/{chain_id}",
        "params_extractor": extract_chain_context
    },
    {
        "intent": "get_recommendation",
        "patterns": ["怎么处理", "建议", "how to handle"],
        "api": "/api/remediation/chains/{chain_id}",
        "params_extractor": extract_chain_context
    },
    {
        "intent": "general_chat",
        "patterns": [],  # 默认兜底
        "api": None,
        "params_extractor": None
    }
]
```

### LLM 对话历史存储

**推荐策略: 摘要压缩 (Context Compression)**

```python
async def compress_history(messages: List[Dict]) -> str:
    """当对话超过 20 轮时，压缩历史为摘要"""
    if len(messages) <= 20:
        return messages

    # 使用 LLM 生成摘要
    summary_prompt = f"""请总结以下对话的要点，保留关键信息和结论：

    {' '.join([f"{m['role']}: {m['content']}" for m in messages[-20:]])}
    """

    summary = await llm.generate(summary_prompt)
    return f"[对话摘要] {summary}\n\n[最近消息]\n" + "\n".join(
        f"{m['role']}: {m['content']}" for m in messages[-5:]
    )
```

---

## 常见陷阱与防护

### Pitfall 2: AI 助手上下文泄露安全敏感信息

**问题:** AI 可能输出原始日志全文、内网资产拓扑等敏感信息

**防护措施:**
1. **上下文 Schema 约束:** 只注入脱敏后的结构化字段
2. **System Prompt 边界:** 明确禁止 AI 自行查询数据
3. **输出过滤:** 正则过滤 AI 输出中的内网 IP 段 (10.x, 192.168.x, 172.16-31.x)

```typescript
// 前端输出过滤
function filterSensitiveInfo(text: string): string {
  return text
    .replace(/10\.\d+\.\d+\.\d+/g, "[内网IP]")
    .replace(/192\.168\.\d+\.\d+/g, "[内网IP]")
    .replace(/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/g, "[内网IP]");
}
```

### Pitfall 3: AI 助手上下文膨胀

**问题:** 上下文无限膨胀导致 Qwen3-32B 推理质量下降

**防护措施:**
1. **上下文硬上限:** 单次对话最多注入 8K token 的上下文
2. **历史摘要压缩:** 超过 20 轮触发压缩
3. **只注入关键字段:** chain_id, severity, alert_count, asset_ip (无原始日志)

### Pitfall 9: 对话历史无持久化

**问题:** 刷新页面丢失对话历史

**防护:** localStorage 存储最近 10 条消息 + 后端 PostgreSQL 持久化

---

## 与现有 v1.0 系统的集成点

### 复用的现有组件

| 组件 | 复用方式 |
|------|----------|
| **RemediationAdvisor** | 复用 `get_recommendation()` 生成处置建议 |
| **RemediationRecommendationSignature** | 复用 DSPy Signature 约束输出格式 |
| **AnalysisService** | 复用 `classify_chain()` 进行告警分析 |
| **Neo4jClient** | 查询告警上下文数据 |

### 新增集成点

| 集成点 | 说明 |
|--------|------|
| `/api/chat/*` | 新增对话 API 端点 |
| `chat_sessions` / `chat_messages` | 新增数据库表 |
| Zustand chatStore | 新增前端状态管理 |

### 关键数据流

```
用户输入 → ChatInput → SSE POST /api/chat/stream
                                    ↓
                              保存用户消息
                                    ↓
                              构建 Prompt (注入上下文)
                                    ↓
                              调用 RemediationAdvisor / LLM
                                    ↓
                              SSE 流式返回 → useChatStream → ChatMessageList
```

---

## 代码示例

### 前端: SSE 流式获取 Hook

```typescript
// useChatStream.ts
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

interface StreamMessage {
  token?: string;
  type: 'chunk' | 'done' | 'error';
}

export function useChatStream() {
  const [messages, setMessages] = useState<Array<{role: string; content: string}>>([]);

  const streamMutation = useMutation({
    mutationFn: async ({ message, sessionId, context }: {
      message: string;
      sessionId: string;
      context: ChatContext;
    }) => {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId, context }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // 添加空消息占位
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6)) as StreamMessage;
          if (data.type === 'chunk' && data.token) {
            assistantMessage += data.token;
            // 实时更新消息
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
              return updated;
            });
          } else if (data.type === 'done') {
            // 完成
          }
        }
      }

      return assistantMessage;
    },
  });

  return { messages, streamMutation };
}
```

### 后端: 流式生成

```python
# llm_stream.py
from typing import AsyncGenerator

async def stream_generate(prompt: str) -> AsyncGenerator[str, None]:
    """流式调用 Qwen3-32B 生成响应

    Args:
        prompt: 构建好的提示词

    Yields:
        生成的 token
    """
    # 方式 1: vLLM HTTP 客户端流式获取
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{VLLM_URL}/v1/completions",
            json={"prompt": prompt, "stream": True},
            headers={"Content-Type": "application/json"}
        ) as resp:
            async for line in resp.content:
                if line:
                    data = json.loads(line)
                    if "choices" in data and len(data["choices"]) > 0:
                        delta = data["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]

    # 方式 2: DSPy 内置流式 (如果有)
    # for token in dspy.stream_predict(prompt):
    #     yield token
```

---

## 环境可用性

| 依赖 | 状态 | 版本 | 说明 |
|------|------|------|------|
| Node.js | ✓ 可用 | ^18 | MCP Server 运行环境 |
| React | ✓ 已有 | ^18.2 | 基础框架 |
| FastAPI | ✓ 已有 | ^0.110 | 后端 API 框架 |
| PostgreSQL | ✓ 已有 | - | 对话历史存储 |
| Redis | ✓ 已有 | - | 会话缓存 |
| Qwen3-32B | ✓ 已有 | - | 私有化 LLM |

**无缺失依赖，Phase 7 可直接开始实现。**

---

## 验证架构

### 测试框架

| 属性 | 值 |
|------|---|
| 框架 | Vitest + React Testing Library |
| 配置文件 | `vite.config.ts` (已有) |
| 快速运行 | `npm test -- --run` |
| 完整测试 | `npm test` |

### Phase Requirements → Test Map

| Req ID | 行为 | 测试类型 | 自动化命令 |
|--------|------|----------|------------|
| AI-01 | AI 助手对话框界面渲染 | 组件测试 | `vitest run ChatDialog.test.tsx` |
| AI-02 | 上下文动态关联 | 集成测试 | `vitest run ContextIndicator.test.tsx` |
| AI-03 | 自然语言查询响应 | API 测试 | `pytest tests/test_chat.py::test_nl_query` |
| AI-04 | AI 处理建议生成 | 单元测试 | `pytest tests/test_remediation.py` |
| AI-05 | 对话历史持久化 | 集成测试 | `pytest tests/test_chat.py::test_history_persistence` |

### Wave 0 缺口

- [ ] `tests/test_chat.py` - 对话 API 测试
- [ ] `tests/test_chat_history.py` - 历史持久化测试
- [ ] `frontend/src/components/chat/ChatDialog.test.tsx` - UI 组件测试

---

## 研究结论

### 推荐方案

1. **前端:** Radix UI Dialog + Zustand + TanStack Query SSE
2. **后端:** FastAPI StreamingResponse + PostgreSQL JSONB
3. **上下文关联:** System Prompt 注入 + 上下文 Schema 约束
4. **NL 查询:** LLM 意图识别 + 预定义 API 映射
5. **历史存储:** PostgreSQL + 摘要压缩策略

### 关键防护措施

- **Pitfall 2 (上下文泄露):** 上下文 Schema 只含脱敏字段，禁止原始日志
- **Pitfall 3 (上下文膨胀):** 8K token 上限 + 20 轮摘要压缩
- **Pitfall 9 (历史丢失):** localStorage + PostgreSQL 双写

### 置信度

| 领域 | 置信度 | 原因 |
|------|--------|------|
| 前端对话组件 | HIGH | Radix UI + React 模式成熟 |
| 后端 SSE | HIGH | FastAPI StreamingResponse 官方支持 |
| 上下文注入 | MEDIUM | 需要实际验证脱敏效果 |
| NL 查询意图识别 | MEDIUM | 需要 DSPy 调试确认准确率 |

---

## 参考资料

- **React Streaming:** https://react.dev/reference/react/useDeferredValue (流式更新模式)
- **FastAPI StreamingResponse:** https://fastapi.tiangolo.com/advanced/using-alternative-streaming-response/
- **Radix UI Dialog:** https://www.radix-ui.com/primitives/docs/components/dialog
- **Zustand Chat Store:** https://zustand-demo.pmnd.rs/
- **TanStack Query Streaming:** https://tanstack.com/query/latest/docs/framework/react/reference/useQuery
