"""DSPy 签名 - 攻击链误报分类

定义攻击链二分类的输入输出字段
遵循 parser/dspy/signatures/__init__.py 中的 LogParserSignature 模式
"""

# 检测 dspy-ai 是否真正可用（不仅仅是 stub 包）
DSPY_AVAILABLE = False
try:
    import dspy
    # 检查 dspy-ai 真正的类存在，而不是 stub
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
except ImportError:
    dspy = None


# 如果 dspy 可用，使用真实实现；否则使用 stub
if DSPY_AVAILABLE:
    class FalsePositiveClassifierSignature(dspy.Signature):
        """攻击链二分类：误报 vs 真实攻击

        输入：攻击链完整数据 + 预置规则匹配结果 + 威胁情报
        输出：是否真实攻击 + 置信度 + 推理过程 + 严重度

        分类粒度：攻击链级别（per D-01），不是单条告警
        置信度：0.0-1.0 连续分数（per D-03）
        """

        # ========== 输入字段 ==========
        chain_data = dspy.InputField(
            desc="攻击链完整数据，包含告警列表、时间范围、ATT&CK映射"
        )
        rule_matched = dspy.InputField(
            desc="预置规则匹配结果，None表示无规则命中"
        )
        threat_intel = dspy.InputField(
            desc="威胁情报命中情况"
        )

        # ========== 输出字段 ==========
        is_real_threat = dspy.OutputField(
            desc="是否为真实攻击: true/false"
        )
        confidence = dspy.OutputField(
            desc="置信度 0.0-1.0"
        )
        reasoning = dspy.OutputField(
            desc="分类推理过程"
        )
        severity = dspy.OutputField(
            desc="严重度: critical/high/medium/low"
        )
else:
    # Stub 实现 - 当 dspy-ai 未安装时使用
    class _Field:
        """Stub for DSPy InputField/OutputField."""
        def __init__(self, desc: str = ""):
            self.desc = desc

    def InputField(desc: str = ""):
        """Stub for DSPy InputField."""
        return _Field(desc=desc)

    def OutputField(desc: str = ""):
        """Stub for DSPy OutputField."""
        return _Field(desc=desc)

    class FalsePositiveClassifierSignature:
        """攻击链二分类签名 - Stub 实现

        当 dspy-ai 未安装时使用此 stub。
        真正的 DSPy Signature 在安装 dspy-ai 后自动使用。
        """
        chain_data = InputField(desc="攻击链完整数据，包含告警列表、时间范围、ATT&CK映射")
        rule_matched = InputField(desc="预置规则匹配结果，None表示无规则命中")
        threat_intel = InputField(desc="威胁情报命中情况")
        is_real_threat = OutputField(desc="是否为真实攻击: true/false")
        confidence = OutputField(desc="置信度 0.0-1.0")
        reasoning = OutputField(desc="分类推理过程")
        severity = OutputField(desc="严重度: critical/high/medium/low")
