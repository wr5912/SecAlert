"""
LLM 配置模块

根据环境变量配置并提供 LLM 实例
支持 vLLM (Qwen3-32B), DeepSeek, MiniMax
"""

import os
from typing import Optional, Any

# DSPy 可用性检测
DSPY_AVAILABLE = False
try:
    import dspy
    if hasattr(dspy, 'Signature') and hasattr(dspy, 'Module'):
        DSPY_AVAILABLE = True
except ImportError:
    dspy = None


class LLMConfig:
    """LLM 配置类"""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "deepseek").lower()
        self.lm = None
        self._initialize()

    def _initialize(self):
        """根据配置初始化 LLM"""
        if not DSPY_AVAILABLE:
            print("警告: DSPy 不可用，LLM 功能将受限")
            return

        if self.provider == "vllm":
            self._init_vllm()
        elif self.provider == "deepseek":
            self._init_deepseek()
        elif self.provider == "minimax":
            self._init_minimax()
        else:
            print(f"警告: 未知的 LLM 提供者: {self.provider}")

    def _init_vllm(self):
        """初始化 vLLM (本地 Qwen3-32B)"""
        try:
            import dspy

            base_url = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")
            model = os.getenv("VLLM_MODEL", "Qwen/Qwen3-32B")
            api_key = os.getenv("VLLM_API_KEY", "EMPTY")

            # 使用 dspy.LM
            self.lm = dspy.LM(
                model=f"vllm/{model}",
                api_base=base_url,
                api_key=api_key,
            )
            print(f"LLM 初始化: vLLM ({model})")
        except Exception as e:
            print(f"vLLM 初始化失败: {e}")

    def _init_deepseek(self):
        """初始化 DeepSeek"""
        try:
            import dspy

            api_key = os.getenv("DEEPSEEK_API_KEY")
            base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
            model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

            if not api_key:
                print("警告: DEEPSEEK_API_KEY 未设置")
                return

            # 使用 dspy.LM 配置 OpenAI兼容接口
            self.lm = dspy.LM(
                model=f"openai/{model}",
                api_base=f"{base_url}/v1",
                api_key=api_key,
            )
            print(f"LLM 初始化: DeepSeek ({model})")
        except Exception as e:
            print(f"DeepSeek 初始化失败: {e}")

    def _init_minimax(self):
        """初始化 MiniMax"""
        try:
            import dspy

            api_key = os.getenv("MINIMAX_API_KEY")
            base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1")
            model = os.getenv("MINIMAX_MODEL", "abab6.5s-chat")

            if not api_key:
                print("警告: MINIMAX_API_KEY 未设置")
                return

            self.lm = dspy.LM(
                model=f"openai/{model}",
                api_base=base_url,
                api_key=api_key,
            )
            print(f"LLM 初始化: MiniMax ({model})")
        except Exception as e:
            print(f"MiniMax 初始化失败: {e}")

    def get_lm(self) -> Optional[Any]:
        """获取 LLM 实例"""
        return self.lm

    def is_available(self) -> bool:
        """检查 LLM 是否可用"""
        return self.lm is not None


# 全局 LLM 实例
_llm_config: Optional[LLMConfig] = None


def get_llm_config() -> LLMConfig:
    """获取 LLM 配置单例"""
    global _llm_config
    if _llm_config is None:
        _llm_config = LLMConfig()
    return _llm_config


def get_lm() -> Optional[Any]:
    """获取 LLM 实例的快捷函数"""
    return get_llm_config().get_lm()


def is_llm_available() -> bool:
    """检查 LLM 是否可用的快捷函数"""
    return get_llm_config().is_available()
