"""DSPy log parser program for tier-3 LLM fallback.

Stub implementation for Python 3.8 compatibility.
Real DSPy (dspy-ai) requires Python 3.9+ and will be installed
during Phase 2 when LLM integration begins.
"""


class LogParserProgram:
    """Three-tier parser tier 3 - LLM-based parsing for novel formats.

    This is a stub implementation. The real DSPy program will be used
    when dspy-ai is installed in Phase 2.
    """

    def __init__(self, lm=None):
        self.lm = lm

    def parse(self, raw_log: str, source_type: str = "未知") -> dict:
        """Parse unknown log format using LLM inference.

        Returns error since LLM integration is not yet configured.
        """
        return {
            "error": "LLM not configured",
            "source_type": source_type,
            "raw_log": raw_log[:100] if raw_log else "",
            "note": "DSPy LLM parsing will be enabled in Phase 2"
        }
