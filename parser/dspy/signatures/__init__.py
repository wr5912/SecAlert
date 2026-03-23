"""DSPy signatures for log parsing.

Stub implementation for Python 3.8 compatibility.
Real DSPy (dspy-ai) requires Python 3.9+ and will be installed
during Phase 2 when LLM integration begins.
"""


class _Field:
    """Stub for DSPy InputField/OutputField."""

    def __init__(self, desc: str = ""):
        self.desc = desc


def InputField(desc: str = ""):
    """Stub for DSPy InputField decorator."""
    return _Field(desc=desc)


def OutputField(desc: str = ""):
    """Stub for DSPy OutputField decorator."""
    return _Field(desc=desc)


class LogParserSignature:
    """Signature for parsing unknown log formats into structured events.

    This is a stub implementation. The real DSPy Signature will be used
    when dspy-ai is installed in Phase 2.
    """

    raw_logs = InputField(desc="3-5条原始日志示例")
    source_type = InputField(desc="数据源类型描述，如 suricata、firewall")

    regex_pattern = OutputField(desc="Python正则，包含命名捕获组")
    field_mappings = OutputField(desc="字段映射字典")
    confidence = OutputField(desc="置信度 0-1")
