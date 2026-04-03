"""
DLQ API 路由

提供 DLQ 消息的查询、重处理和管理接口。

Endpoints:
- GET  /api/v1/dlq                    # 列出 DLQ 消息
- GET  /api/v1/dlq/{id}               # 查看详情
- POST /api/v1/dlq/{id}/reprocess     # 手动重处理
- POST /api/v1/dlq/reprocess-all      # 重处理所有 pending
- GET  /api/v1/dlq/stats              # DLQ 统计
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dlq", tags=["dlq"])

# Redis 配置
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


class DLQMessageResponse(BaseModel):
    message_id: str
    original_event: dict
    error: str
    source: str
    retry_count: int
    first_failure: Optional[str]
    last_retry: Optional[str]
    status: str
    original_topic: str


class ReprocessResponse(BaseModel):
    message_id: str
    success: bool
    message: str


class DLQStatsResponse(BaseModel):
    total_messages: int
    pending_count: int
    retrying_count: int
    archived_count: int
    reprocessed_count: int


def get_redis_client():
    """获取 Redis 客户端"""
    try:
        import redis
        redis_url = REDIS_URL.replace("redis://", "")
        host_port = redis_url.split(":")
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 6379
        client = redis.Redis(host=host, port=port, decode_responses=True)
        client.ping()
        return client
    except Exception as e:
        logger.error(f"Redis 连接失败: {e}")
        return None


def get_minio_client():
    """获取 MinIO 客户端"""
    try:
        from minio import Minio
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        client = Minio(
            endpoint,
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=False
        )
        return client
    except Exception as e:
        logger.error(f"MinIO 连接失败: {e}")
        return None


@router.get("", response_model=list[DLQMessageResponse])
async def list_dlq_messages(
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    offset: int = Query(0, ge=0)
):
    """列出 DLQ 消息"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        # 获取所有 DLQ 消息的 key
        keys = redis.keys("dlq:*")
        keys = [k for k in keys if not k.endswith(":retry_queue")]

        # 过滤状态
        messages = []
        for key in keys:
            data = redis.hgetall(key)
            if status and data.get("status") != status:
                continue
            messages.append(DLQMessageResponse(
                message_id=data.get("message_id", key.replace("dlq:", "")),
                original_event=json.loads(data.get("original_event", "{}")),
                error=data.get("error", ""),
                source=data.get("source", ""),
                retry_count=int(data.get("retry_count", 0)),
                first_failure=data.get("first_failure"),
                last_retry=data.get("last_retry") or None,
                status=data.get("status", "unknown"),
                original_topic=data.get("original_topic", "unknown")
            ))

        # 排序: 按 first_failure 降序
        messages.sort(key=lambda x: x.first_failure or "", reverse=True)

        # 分页
        return messages[offset:offset + limit]

    except Exception as e:
        logger.error(f"查询 DLQ 消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=DLQStatsResponse)
async def get_dlq_stats():
    """获取 DLQ 统计"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        keys = redis.keys("dlq:*")
        keys = [k for k in keys if not k.endswith(":retry_queue")]

        stats = {
            "total_messages": len(keys),
            "pending_count": 0,
            "retrying_count": 0,
            "archived_count": 0,
            "reprocessed_count": 0
        }

        for key in keys:
            status = redis.hget(key, "status")
            if status == "pending":
                stats["pending_count"] += 1
            elif status == "retrying":
                stats["retrying_count"] += 1
            elif status == "archived":
                stats["archived_count"] += 1
            elif status == "reprocessed":
                stats["reprocessed_count"] += 1

        return DLQStatsResponse(**stats)

    except Exception as e:
        logger.error(f"获取 DLQ 统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{message_id}", response_model=DLQMessageResponse)
async def get_dlq_message(message_id: str):
    """获取单条 DLQ 消息详情"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        key = f"dlq:{message_id}"
        data = redis.hgetall(key)

        if not data:
            raise HTTPException(status_code=404, detail=f"消息 {message_id} 不存在")

        return DLQMessageResponse(
            message_id=data.get("message_id", message_id),
            original_event=json.loads(data.get("original_event", "{}")),
            error=data.get("error", ""),
            source=data.get("source", ""),
            retry_count=int(data.get("retry_count", 0)),
            first_failure=data.get("first_failure"),
            last_retry=data.get("last_retry") or None,
            status=data.get("status", "unknown"),
            original_topic=data.get("original_topic", "unknown")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 DLQ 消息详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{message_id}/reprocess", response_model=ReprocessResponse)
async def reprocess_dlq_message(message_id: str):
    """手动重处理单条 DLQ 消息"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        key = f"dlq:{message_id}"
        data = redis.hgetall(key)

        if not data:
            raise HTTPException(status_code=404, detail=f"消息 {message_id} 不存在")

        # 获取原始事件
        original_event = json.loads(data.get("original_event", "{}"))

        # 尝试重新解析
        success = False
        try:
            from parser.pipeline import ThreeTierParser
            parser = ThreeTierParser()
            raw_log = original_event.get("raw", str(original_event))
            source_type = original_event.get("source_type", "unknown")
            result = parser.parse(raw_log, source_type)
            success = result.get("parse_status") != "fallback"
        except Exception as e:
            logger.error(f"重处理解析失败: {e}")
            success = False

        if success:
            # 更新状态
            redis.hset(key, "status", "reprocessed")
            return ReprocessResponse(
                message_id=message_id,
                success=True,
                message="重处理成功"
            )
        else:
            # 重新加入重试队列
            import time
            redis.hset(key, mapping={
                "status": "retrying",
                "retry_count": int(data.get("retry_count", 0)) + 1,
                "last_retry": datetime.now(timezone.utc).isoformat()
            })
            # 1 min 后重试
            redis.zadd("dlq:retry_queue", {message_id: time.time() + 60})

            return ReprocessResponse(
                message_id=message_id,
                success=False,
                message="重新加入重试队列"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重处理 DLQ 消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reprocess-all")
async def reprocess_all_dlq():
    """重处理所有 pending 状态的 DLQ 消息"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        keys = redis.keys("dlq:*")
        keys = [k for k in keys if not k.endswith(":retry_queue")]

        reprocessed_count = 0
        for key in keys:
            data = redis.hgetall(key)
            if data.get("status") == "pending":
                message_id = data.get("message_id", key.replace("dlq:", ""))
                # 重新加入重试队列
                import time
                redis.hset(key, "status", "retrying")
                redis.zadd("dlq:retry_queue", {message_id: time.time() + 60})
                reprocessed_count += 1

        return {
            "success": True,
            "reprocessed_count": reprocessed_count,
            "message": f"已将 {reprocessed_count} 条消息加入重试队列"
        }

    except Exception as e:
        logger.error(f"批量重处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/archived/{date}")
async def list_archived_messages(date: str):
    """列出指定日期的归档消息 (YYYY-MM-DD)"""
    minio = get_minio_client()
    if not minio:
        raise HTTPException(status_code=503, detail="MinIO 不可用")

    bucket = os.getenv("MINIO_BUCKET", "secalert-dlq")

    try:
        # 列出归档对象
        prefix = f"dlq-archive/{date}/"
        objects = list(minio.list_objects(bucket, prefix=prefix, recursive=True))

        result = []
        for obj in objects:
            if obj.object_name.endswith(".meta.json"):
                continue
            # 读取元数据
            try:
                data = minio.get_object(bucket, obj.object_name)
                content = data.read().decode('utf-8')
                result.append(json.loads(content))
            except Exception as e:
                logger.warning(f"读取归档文件失败: {obj.object_name}, {e}")

        return {
            "date": date,
            "count": len(result),
            "messages": result
        }

    except Exception as e:
        logger.error(f"列出归档消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{message_id}")
async def delete_dlq_message(message_id: str):
    """删除单条 DLQ 消息"""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Redis 不可用")

    try:
        key = f"dlq:{message_id}"
        if not redis.exists(key):
            raise HTTPException(status_code=404, detail=f"消息 {message_id} 不存在")

        redis.delete(key)
        redis.zrem("dlq:retry_queue", message_id)

        return {"success": True, "message": f"消息 {message_id} 已删除"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除 DLQ 消息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
