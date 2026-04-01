# Phase 13: Claude Code AI 后端 - Validation

**Phase:** 13-claude-code-ai
**Created:** 2026-04-01
**Reference:** 13-RESEARCH.md (Validation Architecture)

---

## Validation Strategy

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | pyproject.toml [tool.pytest.ini_options] |
| Quick run command | `pytest tests/test_agent/ -x -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | Plan |
|--------|----------|-----------|-------------------|------|
| AG-01 | SDK 安装成功 | smoke | `python -c "from claude_agent_sdk import ClaudeSDKClient"` | 13-01 |
| AG-02 | WebSocket 连接成功 | integration | `pytest tests/test_agent/test_websocket.py::test_ws_endpoint_accepts_connection -x` | 13-02 |
| AG-02 | 流式响应正常 | integration | `pytest tests/test_agent/test_websocket.py -x` | 13-02 |
| AG-03 | 工具注册成功 | unit | `pytest tests/test_agent/test_tools.py -x` | 13-01 |
| AG-03 | 工具调用返回结果 | integration | `pytest tests/test_agent/test_tools.py -x` | 13-01 |
| AG-04 | DeepSeek API 配置正确 | smoke | `python -c "import os; assert os.getenv('ANTHROPIC_BASE_URL')"` | 13-02 |
| AG-05 | Fallback 机制工作 | integration | `pytest tests/test_agent/test_fallback.py -x` | 13-02 |
| AG-05 | E2E 完整流程 | e2e | `pytest tests/test_agent/test_e2e.py -x` | 13-03 |

### Verification Gates

#### Wave 1 (Plan 13-01) - Agent 基础设施
- [ ] `pip show claude-agent-sdk` 返回版本 >= 0.1.53
- [ ] `python -c "from claude_agent_sdk import ClaudeSDKClient"` 成功
- [ ] `python -c "from src.agent import SYSTEM_PROMPT, get_agent_config, create_agent_client, security_tools"` 成功
- [ ] `python -c "from src.agent.tools import security_tools; assert security_tools.name == 'security'"` 成功
- [ ] `pytest tests/test_agent/test_tools.py -x -v` 通过
- [ ] `pytest tests/test_agent/test_client.py -x -v` 通过

#### Wave 2 (Plan 13-02) - WebSocket 端点
- [ ] `python -c "from src.api.agent_endpoints import router; print(router.prefix)"` 返回 `/ws`
- [ ] `grep -l "websocket" src/api/agent_endpoints.py` 成功
- [ ] `python -c "from src.api.main import app; routes = [r.path for r in app.routes]; assert any('/ws/chat' in str(r) for r in routes)"` 成功
- [ ] `grep -c "streamChatWebSocket" frontend/src/api/chat.ts` > 0
- [ ] `pytest tests/test_agent/test_websocket.py -x -v` 通过
- [ ] `pytest tests/test_agent/test_fallback.py -x -v` 通过

#### Wave 3 (Plan 13-03) - 测试套件
- [ ] `pytest tests/test_agent/ -x -v` 全部通过
- [ ] 测试报告生成

### Sampling Rate
- **Per task commit:** `pytest tests/test_agent/ -x -q`
- **Per wave merge:** `pytest tests/ -v --tb=short`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Known Limitations
1. WebSocket E2E 测试需要真实 SDK 连接，在 CI 环境中可能需要 mock
2. Fallback 测试需要 DEEPSEEK_API_KEY 环境变量，否则跳过
3. 前端 TypeScript 测试需要 tsc 编译通过

### Validation Artifacts
- Test coverage report: `pytest --cov=src/agent --cov-report=html`
- API endpoint docs: 自动生成于 `/docs/api/`
