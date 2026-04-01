"""自定义安全工具 - 供 Agent 调用"""

import os
import httpx
from typing import Any
from claude_agent_sdk import tool, create_sdk_mcp_server

# API 基础 URL
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")


@tool(
    name="query_alerts",
    description="查询安全告警列表，支持按严重度筛选",
    input_schema={
        "severity": str,  # 严重度: critical|high|medium|low
        "limit": int     # 返回数量限制，默认 10
    }
)
async def query_alerts(args: dict) -> dict:
    """查询告警列表工具

    Args:
        args: 包含 severity 和 limit 的字典

    Returns:
        格式化后的告警列表字符串
    """
    severity = args.get("severity", "all")
    limit = args.get("limit", 10)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/chains",
                params={"severity": severity, "limit": limit, "status": "active"}
            )
            response.raise_for_status()
            data = response.json()

            chains = data.get("chains", [])
            if not chains:
                return {"content": [{"type": "text", "text": "没有找到符合条件的告警。"}]}

            # 格式化输出
            result = f"找到 {len(chains)} 条告警（严重度: {severity}）：\n\n"
            for i, chain in enumerate(chains[:5], 1):
                severity_label = chain.get("max_severity", "unknown").upper()
                asset_ip = chain.get("asset_ip", "未知")
                alert_count = chain.get("alert_count", 0)
                result += f"{i}. [{severity_label}] {asset_ip} - {alert_count} 条告警\n"

            return {"content": [{"type": "text", "text": result}]}
        except httpx.HTTPError as e:
            return {"content": [{"type": "text", "text": f"查询告警失败: {str(e)}"}]}


@tool(
    name="analyze_chain",
    description="分析攻击链详情，包括攻击阶段、关联实体、告警时间线",
    input_schema={
        "chain_id": str  # 攻击链 ID
    }
)
async def analyze_chain(args: dict) -> dict:
    """攻击链分析工具

    Args:
        args: 包含 chain_id 的字典

    Returns:
        格式化后的攻击链详情字符串
    """
    chain_id = args.get("chain_id")
    if not chain_id:
        return {"content": [{"type": "text", "text": "错误: 需要提供 chain_id"}]}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 获取攻击链详情
            response = await client.get(f"{API_BASE_URL}/api/chains/{chain_id}")
            response.raise_for_status()
            data = response.json()

            # 格式化输出
            severity = data.get("max_severity", "unknown").upper()
            asset_ip = data.get("asset_ip", "未知")
            alert_count = data.get("alert_count", 0)
            status = data.get("status", "unknown")

            result = f"**攻击链 {chain_id[:8]}... 详情**\n\n"
            result += f"- 严重度: {severity}\n"
            result += f"- 状态: {status}\n"
            result += f"- 目标资产: {asset_ip}\n"
            result += f"- 关联告警数: {alert_count}\n\n"

            # 告警列表
            alerts = data.get("alerts", [])
            if alerts:
                result += "**关联告警:**\n"
                for alert in alerts[:5]:
                    src_ip = alert.get("src_ip", "未知")
                    sig = alert.get("alert_signature", "未知")
                    timestamp = alert.get("timestamp", "")[:16] if alert.get("timestamp") else "未知"
                    result += f"- [{timestamp}] {src_ip}: {sig}\n"

            return {"content": [{"type": "text", "text": result}]}
        except httpx.HTTPError as e:
            return {"content": [{"type": "text", "text": f"分析攻击链失败: {str(e)}"}]}


# 创建 MCP Server
security_tools = create_sdk_mcp_server(
    name="security",
    version="1.0.0",
    tools=[query_alerts, analyze_chain]
)