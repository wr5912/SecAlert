# Phase 13: Claude Code AI 后端 - Research

**Researched:** 2026-04-01
**Domain:** claude-agent-sdk 集成 FastAPI WebSocket 后端
**Confidence:** HIGH

## Summary

Phase 13 需要将 Claude Code SDK 集成到 SecAlert 后端，实现支持流式对话的自定义 AI Agent 后端服务。核心是 `claude-agent-sdk` v0.1.53 (PyPI)，通过 `ClaudeSDKClient` 提供 Agent 能力，使用 `ClaudeAgentOptions` 配置白名单工具和权限模式，通过 `register_tool` 注册自定义安全工具。

**Primary recommendation:** 使用 SDK 原生的 `query()` + `receive_response()` 模式实现流式对话，WebSocket 端点复用现有 `/api/chat` 路由架构，新增 `/ws/chat/{user_id}` 端点。

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 使用 claude-agent-sdk（方案 A: 官方 Agent SDK）
- 使用 Python FastAPI + WebSocket 架构
- 复用现有 /api/chat 接口
- 使用 DeepSeek API（ANTHROPIC_BASE_URL=https://api.deepseek.com）
- per-user 独立沙箱目录 `./workspaces/{user_id}`
- permission_mode="acceptEdits" 防止后端挂起

### Claude's Discretion
- SDK 的具体 API 用法（register_tool 实现细节）
- 会话管理具体实现
- 前端 WebSocket 集成方式

### Deferred Ideas (OUT OF SCOPE)
- MCP Server 模式（方案 B）
- 无头子进程模式（方案 C）

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AG-01 | claude-agent-sdk 安装与配置 | SDK v0.1.53 需要 Python 3.10+，Docker 容器已满足，本地开发需注意 Python 版本 |
| AG-02 | WebSocket 流式对话服务 | 复用 chat_endpoints.py 架构，新增 WebSocket 端点，SDK query() 返回 async iterator |
| AG-03 | 自定义安全工具 | 使用 @tool 装饰器 + create_sdk_mcp_server 注册内部 API 工具（告警查询、攻击链分析） |
| AG-04 | DeepSeek API Key 配置 | ANTHROPIC_BASE_URL=https://api.deepseek.com + DEEPSEEK_API_KEY 环境变量 |
| AG-05 | 集成测试与验证 | pytest + pytest-asyncio，已有测试框架 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| claude-agent-sdk | 0.1.53 | Claude Code Python SDK | 官方 SDK，提供完整 Agent 能力 |
| FastAPI | >=0.100.0 | Web API 框架 | 现有架构，已使用 |
| uvicorn | >=0.20.0 | ASGI 服务器 | 现有架构，已使用 |
| websockets | 最新版 | WebSocket 支持 | FastAPI WebSocket 依赖 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| httpx | >=0.24.0 | HTTP 客户端 | 内部 API 调用 |
| pydantic | >=2.5.0 | 数据验证 | 请求/响应模型 |
| pytest-asyncio | >=0.21.0 | 异步测试 | E2E 测试 |

**Installation:**
```bash
pip install claude-agent-sdk websockets
```

**Version verification:** claude-agent-sdk 0.1.53 发布于 2025-2026，验证方式：
```bash
pip show claude-agent-sdk
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/
│   ├── chat_endpoints.py      # 现有 SSE 端点
│   ├── agent_endpoints.py     # 新增: Agent WebSocket 端点
│   └── main.py               # FastAPI 入口
├── agent/
│   ├── client.py             # ClaudeSDKClient 封装
│   ├── tools.py              # 自定义安全工具定义
│   └── config.py             # Agent 配置管理
└── workspaces/               # Per-user 沙箱目录 (gitignore)
    └── {user_id}/
        └── .claude/          # SDK 状态存储
```

### Pattern 1: ClaudeSDKClient 流式对话
**What:** 使用 `query()` + `receive_response()` 实现流式输出
**When to use:** WebSocket 流式对话
**Example:**
```python
# Source: https://github.com/anthropics/claude-agent-sdk-python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    system_prompt="你是 SecAlert 安全分析助手",
    allowed_tools=["Read", "Bash"],
    permission_mode="acceptEdits",
    cwd=f"./workspaces/{user_id}",
    mcp_servers={"security": security_tools_server}
)

async with ClaudeSDKClient(options=options) as client:
    await client.query(user_message)
    async for msg in client.receive_response():
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    await websocket.send_json({"type": "text", "content": block.text})
```

### Pattern 2: 自定义安全工具 (SDK MCP Server)
**What:** 使用 @tool 装饰器注册 Python 函数为 Agent 工具
**When to use:** 需要 AI 调用内部 API（告警查询、攻击链分析）
**Example:**
```python
# Source: SDK README - Custom Tools section
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool("query_alerts", "查询安全告警列表", {"severity": str, "limit": int})
async def query_alerts(args):
    # 调用内部 API
    result = await call_internal_api(args)
    return {"content": [{"type": "text", "text": str(result)}]}

security_server = create_sdk_mcp_server(
    name="security-tools",
    version="1.0.0",
    tools=[query_alerts]
)

options = ClaudeAgentOptions(
    mcp_servers={"security": security_server},
    allowed_tools=["mcp__security__query_alerts"]
)
```

### Pattern 3: WebSocket + SDK 集成
**What:** FastAPI WebSocket 端点连接 SDK 流式输出
**When to use:** 前端需要实时流式响应
**Example:**
```python
# Source: 实现指南 + SDK 文档
@app.websocket("/ws/chat/{user_id}")
async def chat_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=["Read", "Bash"],
        permission_mode="acceptEdits",
        cwd=f"./workspaces/{user_id}",
        mcp_servers={"security": security_server}
    )

    async with ClaudeSDKClient(options=options) as client:
        while True:
            user_message = await websocket.receive_text()
            await client.query(user_message)
            async for msg in client.receive_response():
                # 处理不同消息类型
                pass
```

### Pattern 4: Fallback 降级机制
**What:** SDK 失败时回退到现有 DeepSeek API
**When to use:** SDK 不可用或 API Key 无效
**Example:**
```python
async def chat_with_fallback(user_message: str, context: ChatContext):
    try:
        # 优先使用 Claude SDK
        async with ClaudeSDKClient(options=options) as client:
            # ... 流式处理
    except (CLINotFoundError, CLIConnectionError) as e:
        # Fallback 到 DeepSeek
        return await call_deepseek_api(system_prompt, user_message)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Agentic Loop | 自己实现 ReAct/MRPDo | claude-agent-sdk | SDK 内置成熟的 Agent 循环，防止死循环 |
| 工具注册系统 | 自己实现函数调用分发 | @tool + create_sdk_mcp_server | 原生支持类型检查和参数验证 |
| 流式输出 | 自己解析 SSE/chunked | SDK query() 返回 async iterator | 已有成熟的流式 API |
| 多用户隔离 | 自己管理会话状态 | SDK + per-user cwd | SDK 设计支持多用户隔离 |

**Key insight:** Claude Code SDK 已经处理了 Agent 开发中最复杂的部分（循环控制、工具调用、上下文管理），自己实现不仅容易出错还浪费精力。

---

## Common Pitfalls

### Pitfall 1: Python 版本不兼容
**What goes wrong:** SDK 安装失败或运行时报错
**Why it happens:** SDK 要求 Python 3.10+，项目 Dockerfile 使用 python:3.10-slim 但本地开发机可能是 3.8
**How to avoid:** 本地开发使用 Docker 容器或升级 Python；pyproject.toml 已声明 requires-python = ">=3.10"
**Warning signs:** `Requires-Python >=3.10` 错误

### Pitfall 2: ANTHROPIC_BASE_URL 配置错误
**What goes wrong:** SDK 连接到 Anthropic 而非 DeepSeek
**Why it happens:** 没有正确设置环境变量
**How to avoid:** 明确设置 `ANTHROPIC_BASE_URL=https://api.deepseek.com` 和 `ANTHROPIC_API_KEY=<key>`
**Warning signs:** `CLIConnectionError` 或 API 401 错误

### Pitfall 3: 工具名称冲突
**What goes wrong:** AI 无法调用自定义工具
**Why it happens:** 工具名称格式不匹配，SDK 使用 `mcp__{server}__{tool}` 前缀
**How to avoid:** allowed_tools 中使用完整名称 `mcp__security__query_alerts`，而非仅 `query_alerts`
**Warning signs:** AI 说"我没有这个工具"

### Pitfall 4: 沙箱目录权限
**What goes wrong:** SDK 无法在 workspace 目录中创建文件
**Why it happens:** 目录不存在或权限不足
**How to avoid:** WebSocket 连接时创建目录 `os.makedirs(user_workspace, exist_ok=True)`
**Warning signs:** `Permission denied` 错误

### Pitfall 5: max_steps 过大导致无限循环
**What goes wrong:** AI 陷入死循环，Token 消耗殆尽
**Why it happens:** 没有设置 max_steps 限制
**How to avoid:** 设置 `max_steps=5-10`，并在 SDK 选项中配置
**Warning signs:** 长时间无响应，Token 消耗异常

---

## Code Examples

### 环境变量配置
```python
# .env 或 docker-compose.yml
ANTHROPIC_API_KEY=sk-dc186731c3904c38a1db793d2e1c6515
ANTHROPIC_BASE_URL=https://api.deepseek.com  # DeepSeek 兼容端点
ANTHROPIC_MODEL=deepseek-chat  # 可选，覆盖默认模型
```

### ClaudeSDKClient 初始化
```python
# src/agent/client.py
from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    CLIConnectionError,
    CLINotFoundError
)

options = ClaudeAgentOptions(
    system_prompt=SYSTEM_PROMPT,
    allowed_tools=[
        "Read", "Write", "Bash",
        "mcp__security__query_alerts",
        "mcp__security__analyze_chain"
    ],
    permission_mode="acceptEdits",  # 自动接受编辑，防止挂起
    cwd=f"./workspaces/{user_id}",   # 沙箱隔离
)

async with ClaudeSDKClient(options=options) as client:
    # 流式查询
    await client.query(prompt)
    async for msg in client.receive_response():
        yield msg
```

### 自定义安全工具定义
```python
# src/agent/tools.py
from claude_agent_sdk import tool, create_sdk_mcp_server
import httpx

@tool("query_alerts", "查询安全告警列表", {
    "severity": str,      # 严重度: critical|high|medium|low
    "limit": int          # 返回数量限制
})
async def query_alerts(args):
    """查询告警列表工具"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/chains",
            params={"severity": args["severity"], "limit": args["limit"]}
        )
        data = response.json()
    return {"content": [{"type": "text", "text": str(data)}]}

@tool("analyze_chain", "分析攻击链详情", {"chain_id": str})
async def analyze_chain(args):
    """攻击链分析工具"""
    chain_id = args["chain_id"]
    # 调用内部 API 获取详情
    ...
    return {"content": [{"type": "text", "text": analysis_result}]}

# 创建 MCP Server
security_tools = create_sdk_mcp_server(
    name="security",
    version="1.0.0",
    tools=[query_alerts, analyze_chain]
)
```

### WebSocket 端点
```python
# src/api/agent_endpoints.py
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/chat/{user_id}")
async def agent_chat(websocket: WebSocket, user_id: str):
    await websocket.accept()

    # 创建用户沙箱目录
    user_workspace = f"./workspaces/{user_id}"
    os.makedirs(user_workspace, exist_ok=True)

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        mcp_servers={"security": security_tools},
        allowed_tools=[...],
        permission_mode="acceptEdits",
        cwd=user_workspace
    )

    try:
        async with ClaudeSDKClient(options=options) as client:
            while True:
                message = await websocket.receive_text()
                await client.query(message)

                async for msg in client.receive_response():
                    # 处理消息类型
                    if msg.type == "assistant_message":
                        for block in msg.content:
                            if hasattr(block, 'text'):
                                await websocket.send_json({
                                    "type": "text",
                                    "content": block.text
                                })
                    elif msg.type == "tool_use":
                        await websocket.send_json({
                            "type": "tool",
                            "content": f"执行工具: {msg.tool_name}"
                        })

                await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except (CLINotFoundError, CLIConnectionError) as e:
        # Fallback 到 DeepSeek API
        await fallback_to_deepseek(websocket, message)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE 流式 + DeepSeek API | Claude Code SDK + WebSocket | Phase 13 | 支持 Agentic Loop 和自定义工具 |
| 意图识别 + 固定 API 调用 | register_tool 动态工具调用 | Phase 13 | 更灵活的工具集成 |
| 内存会话存储 | SDK 内置状态 + per-user 沙箱 | Phase 13 | 多用户隔离，更安全 |

**Deprecated/outdated:**
- 纯 DeepSeek API 对话（无 Agent 能力）: Phase 13 后作为 fallback
- 意图识别正则匹配: Phase 13 后被 AI 原生理解取代

---

## Open Questions

1. **SDK max_steps 配置值**
   - What we know: 建议 5-10 步防止死循环
   - What's unclear: 具体业务场景需要多少步
   - Recommendation: 从 10 开始，根据实际测试调整

2. **allowed_tools 白名单范围**
   - What we know: 需要限制高危工具如 Bash
   - What's unclear: 安全场景需要哪些最小工具集
   - Recommendation: 先只开放 Read/Bash，评估后再扩展

3. ** workspaces 目录清理策略**
   - What we know: SDK 会在 cwd 下创建 .claude 目录
   - What's unclear: 何时清理旧 workspace
   - Recommendation: 使用 LRU 或定期清理策略

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.10+ | claude-agent-sdk | 3.8 (本地) / 3.10 (Docker) | 3.8 需升级 | Docker 容器 |
| claude-agent-sdk | Agent SDK | 未安装 | 0.1.53 (PyPI) | — |
| FastAPI | Web API | 已有 | >=0.100.0 | — |
| WebSocket | 流式服务 | FastAPI 内置 | — | SSE fallback |
| pytest-asyncio | 异步测试 | 未安装 | >=0.21.0 | 安装依赖 |

**Missing dependencies with no fallback:**
- claude-agent-sdk: 必须安装
- Python 3.10+: 本地开发需升级或使用 Docker

**Missing dependencies with fallback:**
- pytest-asyncio: 可使用 pytest 同步模式替代（不推荐）

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | pyproject.toml [tool.pytest.ini_options] |
| Quick run command | `pytest tests/test_agent/ -x -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AG-01 | SDK 安装成功 | smoke | `python -c "from claude_agent_sdk import ClaudeSDKClient"` | N/A |
| AG-02 | WebSocket 连接成功 | integration | `pytest tests/test_agent/test_websocket.py::test_connection -x` | NO |
| AG-02 | 流式响应正常 | integration | `pytest tests/test_agent/test_websocket.py::test_stream -x` | NO |
| AG-03 | 工具注册成功 | unit | `pytest tests/test_agent/test_tools.py::test_register_tool -x` | NO |
| AG-03 | 工具调用返回结果 | integration | `pytest tests/test_agent/test_tools.py::test_tool_call -x` | NO |
| AG-04 | DeepSeek API 配置正确 | smoke | `python -c "import os; assert os.getenv('ANTHROPIC_BASE_URL')"` | N/A |
| AG-05 | Fallback 机制工作 | integration | `pytest tests/test_agent/test_fallback.py -x` | NO |
| AG-05 | E2E 完整流程 | e2e | `pytest tests/test_agent/test_e2e.py -x` | NO |

### Sampling Rate
- **Per task commit:** `pytest tests/test_agent/ -x -q`
- **Per wave merge:** `pytest tests/ -v --tb=short`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_agent/` - 目录需创建
- [ ] `tests/test_agent/__init__.py` - 包初始化
- [ ] `tests/test_agent/conftest.py` - shared fixtures
- [ ] `tests/test_agent/test_websocket.py` - WebSocket 测试
- [ ] `tests/test_agent/test_tools.py` - 工具注册测试
- [ ] `tests/test_agent/test_fallback.py` - Fallback 测试
- [ ] `tests/test_agent/test_e2e.py` - E2E 测试
- [ ] Framework install: `pip install claude-agent-sdk pytest-asyncio` (如未安装)

*(Existing test infrastructure: pytest + pytest-asyncio 已在 pyproject.toml dev 依赖中)*

---

## Sources

### Primary (HIGH confidence)
- [claude-agent-sdk GitHub](https://github.com/anthropics/claude-agent-sdk-python) - SDK 源码和示例
- [SDK README](https://github.com/anthropics/claude-agent-sdk-python#readme) - API 文档和示例代码
- [PyPI claude-agent-sdk](https://pypi.org/project/claude-agent-sdk/0.1.53/) - 包信息和版本

### Secondary (MEDIUM confidence)
- [Claude Code SDK 文档](https://platform.claude.com/docs/en/agent-sdk/python) - 官方文档（需跳转）
- [Implementation Guide](./docs/Claude Code作为Agent应用后端的实践指南.md) - 本地实现指南

### Tertiary (LOW confidence)
- WebSearch (未使用，SDK 文档已足够)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SDK 官方文档完整
- Architecture: HIGH - 有明确示例和最佳实践
- Pitfalls: MEDIUM - 部分基于实现指南，需实际验证

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (SDK 版本稳定，更新频率低)
