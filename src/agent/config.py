"""Agent 配置管理"""
import os

# System Prompt - 安全分析助手人设
SYSTEM_PROMPT = """你是 SecAlert 安全分析助手，帮助运维人员理解和处置安全告警。

核心能力:
- 查询和分析安全告警列表
- 解释攻击链详情和攻击路径
- 提供处置建议和 ATT&CK 技术参考

使用原则:
1. 只回答与安全告警相关的问题
2. 如需查询信息，使用提供的工具查询
3. 处置建议必须包含具体操作步骤
4. 回答简洁明了，避免冗余

可用工具:
- query_alerts: 查询告警列表，支持 severity 和 limit 参数
- analyze_chain: 分析攻击链详情，输入 chain_id
"""

# Agent 配置
def get_agent_config(user_id: str) -> dict:
    """获取 Agent 配置

    Args:
        user_id: 用户ID，用于沙箱隔离

    Returns:
        ClaudeAgentOptions 兼容的配置字典
    """
    workspace = f"./workspaces/{user_id}"
    os.makedirs(workspace, exist_ok=True)

    return {
        "system_prompt": SYSTEM_PROMPT,
        "allowed_tools": [
            "Read", "Bash",
            "mcp__security__query_alerts",
            "mcp__security__analyze_chain"
        ],
        "permission_mode": "acceptEdits",
        "cwd": workspace,
        "max_turns": 10,
        "env": {
            "ANTHROPIC_BASE_URL": os.getenv("ANTHROPIC_BASE_URL", "https://api.deepseek.com"),
            "ANTHROPIC_API_KEY": os.getenv("DEEPSEEK_API_KEY", ""),
        }
    }