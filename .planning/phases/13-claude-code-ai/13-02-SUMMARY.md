---
phase: 13-claude-code-ai
plan: "02"
subsystem: agent
tags: [websocket, streaming, fallback, deepseek, fastapi]
dependency-graph:
  requires:
    - phase: 13-01
      provides: Agent 客户端封装 (AgentClient, create_agent_client)
  provides:
    - WebSocket 流式对话端点 /ws/chat/{user_id}
    - DeepSeek Fallback 降级机制
    - 前端 WebSocket 客户端 streamChatWebSocket
  affects:
    - 13-03: 最终 Fallback 机制完善

tech-stack:
  added: [FastAPI WebSocket, httpx AsyncClient]
  patterns: [WebSocket 流式响应, Fallback 降级模式, per-user workspace 隔离]

key-files:
  created:
    - src/api/agent_endpoints.py
  modified:
    - src/api/main.py
    - frontend/src/api/chat.ts

key-decisions:
  - "WebSocket URL 使用动态协议 (ws:/wss:) 根据页面协议选择"
  - "Fallback 响应按 10 字符分块流式发送"

requirements-completed: [AG-02, AG-04]

duration: "~3 min"
completed: 2026-04-01
---

# Phase 13-02: WebSocket 流式对话端点 Summary

**WebSocket 流式对话端点和 Fallback 机制实现完成，Agent 路由已注册到 FastAPI**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-01T09:20:XXZ
- **Completed:** 2026-04-01T09:23:XXZ
- **Tasks:** 3
- **Files modified:** 3

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 创建 WebSocket Agent 端点 | `8562c39` | src/api/agent_endpoints.py |
| 2 | 注册 Agent 路由到 FastAPI | `71270ef` | src/api/main.py |
| 3 | 添加前端 WebSocket 支持 | `165719c` | frontend/src/api/chat.ts |

## Accomplishments

- **Task 1:** WebSocket 端点 `/ws/chat/{user_id}` 实现
  - 接收 JSON: `{"message": "...", "context": {...}}`
  - 发送 JSON: `{"type": "text"|"tool_use"|"done"|"error", "content": "..."}`
  - AgentClient 流式响应处理
  - DeepSeek API Fallback 降级机制
  - per-user workspace 目录创建

- **Task 2:** FastAPI 路由注册
  - agent_router 导入 (在 chat_router 之后)
  - `/ws` 前缀路由已注册

- **Task 3:** 前端 WebSocket 客户端
  - `streamChatWebSocket(message, sessionId, context, onChunk, onDone, onError)`
  - 动态协议选择 (ws:/wss:)
  - 现有 SSE `streamChat` 函数保持不变

## Files Created/Modified

### src/api/agent_endpoints.py (新建)
- WebSocket 端点 `agent_chat(websocket, user_id)`
- `call_deepseek_fallback(system_prompt, user_message)` 函数
- router 导出: `APIRouter(prefix="/ws")`

### src/api/main.py (修改)
- 添加: `from src.api.agent_endpoints import router as agent_router`
- 添加: `app.include_router(agent_router)` (在 chat_router 之后)

### frontend/src/api/chat.ts (修改)
- 新增 `streamChatWebSocket()` 函数 (246-271 行)
- 协议: `ws://host/ws/chat/{sessionId}`
- JSON 消息格式: `{"message": "...", "context": {...}}`

## Decisions Made

- **WebSocket URL 协议选择:** 动态根据 `window.location.protocol` 选择 `ws:` 或 `wss:`，保证开发/生产环境一致性
- **Fallback 分块策略:** 按 10 字符分块流式发送，平衡延迟和渲染性能
- **Workspace 隔离:** per-user workspace 在连接建立时创建，保证用户间数据隔离

## Deviations from Plan

**无偏差** - 计划执行完全符合预期

## Known Stubs

无

## Verification Commands

```bash
# 验证 WebSocket 端点模块
python -c "from src.api.agent_endpoints import router; print(f'WS endpoint: {router.prefix}')"

# 验证路由注册
python -c "from src.api.main import app; routes = [r.path for r in app.routes]; print([r for r in routes if 'ws' in str(r)])"

# 验证前端函数
grep -E "streamChatWebSocket|ws:" frontend/src/api/chat.ts
```

## Next Phase Readiness

- 13-03 Plan: 最终 Fallback 机制完善
- 本次实现的所有接口可直接被 13-03 调用
- 无阻塞依赖

---
*Phase: 13-claude-code-ai*
*Plan: 02*
*Completed: 2026-04-01*