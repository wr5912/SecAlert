"""简化攻击链时间线提取

从 Phase 2 完整攻击链数据中提取关键节点
Per D-05: 简化线性时间线
占位文件，完整实现见 Task 4
"""

from typing import Dict, Any, List

# ATT&CK Tactic 友好名称映射
TACTIC_NAMES: Dict[str, str] = {
    "TA0043": "侦察阶段",
    "TA0001": "初始访问",
    "TA0002": "执行阶段",
    "TA0003": "持久化",
    "TA0004": "权限提升",
    "TA0005": "防御规避",
    "TA0006": "凭证访问",
    "TA0007": "发现",
    "TA0008": "横向移动",
    "TA0009": "收集",
    "TA0010": "数据泄露",
    "TA0011": "命令控制",
}


def simplify_chain_timeline(chain_data: Dict[str, Any]) -> Dict[str, Any]:
    """从完整攻击链提取简化时间线 - Stub

    简化规则 (per D-05):
    - 攻击源 IP: 第一条告警的 src_ip
    - 主要攻击行为: 严重度最高的告警类型
    - 受影响资产: chain_data.asset_ip
    - 攻击阶段: mitre_tactic 映射到友好名称

    Args:
        chain_data: 攻击链完整数据

    Returns:
        简化时间线数据，包含 nodes 和 summary
    """
    alerts = chain_data.get("alerts", [])

    if not alerts:
        return {
            "nodes": [],
            "summary": "无告警数据"
        }

    # 提取攻击源 IP
    src_ip = alerts[0].get("src_ip", "未知")

    # 提取受影响资产
    asset_ip = chain_data.get("asset_ip")
    if not asset_ip:
        # 尝试从告警中提取
        for alert in alerts:
            if alert.get("dst_ip"):
                asset_ip = alert.get("dst_ip")
                break
    if not asset_ip:
        asset_ip = "未知"

    # 严重度最高的告警作为主要行为
    primary_alert = max(
        alerts,
        key=lambda a: a.get("severity", 0) or 0
    )
    primary_behavior = primary_alert.get("alert_signature", "未知行为")
    if not primary_behavior:
        primary_behavior = primary_alert.get("mitre_technique_name", "未知行为")

    # ATT&CK 阶段映射
    tactic = primary_alert.get("mitre_tactic", "")
    attack_phase = TACTIC_NAMES.get(tactic, "攻击中")

    # 构建节点
    nodes = [
        {
            "type": "source",
            "label": f"攻击源: {src_ip}",
            "icon": "search"
        },
        {
            "type": "behavior",
            "label": primary_behavior,
            "icon": "alert"
        },
        {
            "type": "target",
            "label": f"受影响: {asset_ip}",
            "icon": "target"
        },
        {
            "type": "phase",
            "label": attack_phase,
            "icon": "map-pin"
        }
    ]

    # 生成摘要
    summary = f"检测到来自 {src_ip} 对 {asset_ip} 的 {attack_phase}，主要行为: {primary_behavior}"

    return {
        "nodes": nodes,
        "summary": summary
    }
