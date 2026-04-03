"""
DLQ (Dead Letter Queue) 模块

提供死信队列消费者服务、状态管理和 API 接口。

主要组件:
- consumer: DLQ 消费者，处理解析失败的消息
- api: DLQ REST API 路由
"""

from src.collection.dlq.consumer import DLQConsumer, DLQMessage
from src.collection.dlq.api import router as dlq_router

__all__ = [
    "DLQConsumer",
    "DLQMessage",
    "dlq_router",
]
