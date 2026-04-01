# Phase 13 Gap Fix Plan

**Phase:** 13-claude-code-ai
**Created:** 2026-04-01
**Status:** Planned
**Gap:** 前端 WebSocket 未连接到 Agent 后端 (AG-02 部分失败)

---

## Gap 描述

| Truth | Status |
|-------|--------|
| User can engage in streaming AI conversation via WebSocket with real-time responses | PARTIAL |

**问题:**
- `src/api/agent_endpoints.py` - WebSocket 端点已实现 ✓
- `frontend/src/api/chat.ts` - `streamChatWebSocket()` 函数已定义 ✓
- `AIPanel.tsx` - 仍使用 SSE `streamChat()`，未调用 WebSocket 函数 ✗

**根本原因:**
`AIPanel.tsx` 第 233 行调用 `streamChat()` (SSE)，而 Agent WebSocket 端点 `streamChatWebSocket()` 未被使用。

---

## 修复方案

### 选项 A: 直接替换 (推荐)
将 `AIPanel.tsx` 中的 `streamChat` 替换为 `streamChatWebSocket`

**优点:** 简单直接，WebSocket 替代 SSE
**缺点:** 用户失去 SSE 选项

### 选项 B: 配置切换
添加环境变量/配置开关，选择 WebSocket 或 SSE

**优点:** 保留兼容性
**缺点:** 增加 UI 复杂度

### 选项 C: 静默降级
WebSocket 优先，失败时降级到 SSE

**优点:** 最健壮
**缺点:** 实现稍复杂

---

## 推荐方案

**选项 A** — 直接替换

理由：
1. WebSocket 是 Claude Code Agent 的标准接口，支持流式工具调用
2. SSE (`streamChat`) 是为 DeepSeek 直接 API 设计的，Agent 后端使用不同协议
3. 保持简单，不增加配置复杂度

---

## Tasks

### Task 1: 修改 AIPanel.tsx 导入和调用

**Files:** `frontend/src/components/analysis/AIPanel.tsx`

**Action:**
1. 将导入从:
   ```typescript
   import { createSession, streamChat, filterSensitiveInfo } from '../../api/chat';
   ```
   改为:
   ```typescript
   import { createSession, streamChatWebSocket, filterSensitiveInfo } from '../../api/chat';
   ```

2. 将 `streamChat(...)` 调用替换为 `streamChatWebSocket(...)`

**验证:**
```bash
grep -n "streamChatWebSocket" frontend/src/components/analysis/AIPanel.tsx | head -5
grep -n "streamChat(" frontend/src/components/analysis/AIPanel.tsx | grep -v "WebSocket" | head -3
# 期望: streamChat( 只在 SSE 版本的 chat.ts 中出现
```

### Task 2: 验证 streamChatWebSocket API 兼容性

**检查:**
- `streamChatWebSocket` 签名与 `streamChat` 是否兼容
- `sessionId` / `chatContext` 参数是否正确传递

**API 对比:**
```typescript
// SSE 版本
streamChat(message, sessionId, context, onChunk, onDone, onError)

// WebSocket 版本
streamChatWebSocket(message, sessionId, context, onChunk, onDone, onError)
// 参数完全兼容 ✓
```

### Task 3: 运行前端构建验证

**Command:**
```bash
cd frontend && npm run build 2>&1 | tail -20
```

**期望:** 构建成功，无 TypeScript 错误

---

## Acceptance Criteria

1. `AIPanel.tsx` 导入 `streamChatWebSocket` 而非 `streamChat`
2. `AIPanel.tsx` 调用 `streamChatWebSocket` 进行流式对话
3. `npm run build` 前端构建成功
4. 不存在其他调用 `streamChat` 的组件（除了 `chat.ts` 中的 SSE 版本定义）

---

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/components/analysis/AIPanel.tsx` | 替换 streamChat → streamChatWebSocket |
