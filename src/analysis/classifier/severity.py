"""严重度评分模块

ATT&CK 技术严重度基准 + 上下文系数调整
per D-07: 四档分级 Critical/High/Medium/Low
per D-08: ATT&CK 技术严重度基准 + 上下文系数调整
"""

from typing import Dict, Any, Optional


# ATT&CK 技术严重度基准表 (简化版，需扩展完整列表)
# 来源：MITRE ATT&CK Navigator + 行业最佳实践
ATTACK_TECHNIQUE_SEVERITY: Dict[str, str] = {
    # Critical: 数据泄露、持久化控制、命令控制
    "T1041": "critical",  # Exfiltration Over C2 Channel
    "T1050": "critical",  # New Service (Persistence)
    "T1052": "critical",  # Exfiltration Over Physical Medium
    "T1053": "critical",  # Scheduled Task/Job (Persistence)
    "T1056": "critical",  # Input Capture (Credential Access)
    "T1071": "critical",  # Application Layer Protocol (C2)
    "T1105": "critical",  # Ingress Tool Transfer
    "T1222": "critical",  # File and Directory Permissions Modification

    # High: 横向移动、权限提升
    "T1021": "high",      # Remote Services (Lateral Movement)
    "T1068": "high",      # Exploitation for Privilege Escalation
    "T1028": "high",      # Windows Remote Management
    "T1550": "high",      # Use Alternate Authentication Material
    "T1098": "high",      # Account Manipulation
    "T1484": "high",      # Domain Policy Modification
    "T1569": "high",      # System Services

    # Medium: 侦察、初始访问尝试
    "T1046": "medium",    # Network Service Discovery
    "T1190": "medium",    # Exploit Public-Facing Application
    "T1133": "medium",    # External Remote Services
    "T1195": "medium",    # Supply Chain Compromise
    "T1210": "medium",    # Exploitation of Remote Services
    "T1595": "medium",    # Active Scanning

    # Low: 信息收集、扫描
    "T1595": "low",       # Active Scanning (reconnaissance)
    "T1596": "low",       # Search Open Technical Databases
    "T1597": "low",       # Search Closed Sources
    "T1598": "low",       # Phishing
}

# 上下文严重度调整系数
SEVERITY_CONTEXT_MULTIPLIERS: Dict[str, float] = {
    "asset_critical": 1.5,       # 关键资产（金融系统、核心数据库等）
    "internal_source": 1.3,     # 内部源IP（内部攻击面）
    "repeated_attack": 1.4,     # 重复攻击（同源多次尝试）
    "unusually_port": 1.2,     # 非寻常端口
    "after_hours": 1.3,         # 非工作时间
    "new_asset": 1.3,           # 新暴露资产首次告警
}

# 严重度级别顺序
SEVERITY_ORDER = ["low", "medium", "high", "critical"]


def calculate_severity(
    technique_id: Optional[str],
    context: Optional[Dict[str, Any]] = None
) -> str:
    """计算严重度：ATT&CK基准 + 上下文调整

    Args:
        technique_id: ATT&CK technique ID（如 T1041）
        context: 上下文信息，包含以下可选键：
            - asset_critical: bool  是否关键资产
            - internal_source: bool  是否内部源IP
            - repeated_attack: bool  是否重复攻击
            - unusually_port: bool  是否非寻常端口
            - after_hours: bool  是否非工作时间
            - new_asset: bool  是否新暴露资产

    Returns:
        严重度级别：critical/high/medium/low

    算法：
    1. 获取 ATT&CK technique 基准严重度
    2. 应用上下文系数调整
    3. 返回调整后严重度（不超过 critical）
    """
    context = context or {}

    # 获取基准严重度
    base_severity = ATTACK_TECHNIQUE_SEVERITY.get(technique_id, "medium")
    base_idx = SEVERITY_ORDER.index(base_severity)

    # 计算上下文系数乘积
    multiplier = 1.0
    for factor, mult in SEVERITY_CONTEXT_MULTIPLIERS.items():
        if context.get(factor):
            multiplier *= mult

    # 应用系数（限制最大提升到 critical）
    adjusted_idx = min(int(base_idx * multiplier), len(SEVERITY_ORDER) - 1)

    return SEVERITY_ORDER[adjusted_idx]


def get_base_severity(technique_id: str) -> str:
    """获取 ATT&CK technique 基准严重度（不包含上下文调整）"""
    return ATTACK_TECHNIQUE_SEVERITY.get(technique_id, "medium")


def apply_context_adjustment(base_severity: str, context: Dict[str, Any]) -> str:
    """仅应用上下文调整（基准严重度已确定时使用）"""
    base_idx = SEVERITY_ORDER.index(base_severity)

    multiplier = 1.0
    for factor, mult in SEVERITY_CONTEXT_MULTIPLIERS.items():
        if context.get(factor):
            multiplier *= mult

    adjusted_idx = min(int(base_idx * multiplier), len(SEVERITY_ORDER) - 1)
    return SEVERITY_ORDER[adjusted_idx]
