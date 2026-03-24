"""
攻击链 API 接口

FastAPI endpoints for attack chain access
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from ..chain.attack_chain.models import (
    AttackChainModel,
    AttackChainListResponse,
    AttackChainCreate
)
from ..chain.attack_chain.service import AttackChainService
from ..chain.engine.correlator import AlertCorrelator
from ..graph.client import Neo4jClient

router = APIRouter(prefix="/api/chains", tags=["chains"])

# 全局服务实例 (延迟初始化)
_service: Optional[AttackChainService] = None
_correlator: Optional[AlertCorrelator] = None


def get_service() -> AttackChainService:
    """获取服务实例 (单例)"""
    global _service
    if _service is None:
        _service = AttackChainService(neo4j_client=Neo4jClient())
    return _service


def get_correlator() -> AlertCorrelator:
    """获取告警关联器实例 (单例)"""
    global _correlator
    if _correlator is None:
        _correlator = AlertCorrelator()
    return _correlator


@router.get("", response_model=AttackChainListResponse)
async def list_chains(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None)
) -> AttackChainListResponse:
    """
    列出攻击链 (分页)

    - **limit**: 返回数量 (1-100)
    - **offset**: 偏移量
    - **status**: 过滤状态 (active/resolved/false_positive)
    """
    service = get_service()
    result = service.list_chains(limit=limit, offset=offset, status=status)
    return AttackChainListResponse(**result)


@router.get("/{chain_id}", response_model=AttackChainModel)
async def get_chain(chain_id: str) -> AttackChainModel:
    """
    获取攻击链详情

    - **chain_id**: 攻击链 ID
    """
    service = get_service()
    chain = service.get_chain(chain_id)

    if not chain:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    return chain


@router.post("/feed")
async def feed_alerts(alerts: List[Dict[str, Any]]) -> dict:
    """
    向关联器喂送告警数据

    接收 OCSF 格式告警列表，逐条添加到关联器进行关联分析。
    典型用法是在 Phase 1 解析完告警后调用此端点填入数据。

    - **alerts**: OCSF 格式告警列表

    Returns:
    - alerts_processed: 处理的告警数量
    - new_groups: 新形成的关联组数量
    """
    correlator = get_correlator()
    new_groups_count = 0

    for alert in alerts:
        groups = correlator.add_alert(alert)
        new_groups_count += len(groups)

    return {
        "alerts_processed": len(alerts),
        "new_groups": new_groups_count,
        "status": "ok"
    }


@router.post("/reconstruct")
async def reconstruct_chains() -> dict:
    """
    触发攻击链重建

    从关联器缓冲区中的告警数据重建所有攻击链并存储到 Neo4j。
    注意：先调用 POST /api/chains/feed 填入告警数据后再调用此端点。
    """
    from ..chain.attack_chain.service import AttackChainService

    correlator = get_correlator()
    service = get_service()

    # 从关联器重建攻击链
    chain_ids = service.reconstruct_from_correlator(correlator)

    return {
        "status": "completed",
        "chains_reconstructed": len(chain_ids),
        "chain_ids": chain_ids
    }


@router.patch("/{chain_id}/status")
async def update_chain_status(
    chain_id: str,
    status: str = Query(..., pattern="^(active|resolved|false_positive)$")
) -> dict:
    """
    更新攻击链状态

    - **chain_id**: 攻击链 ID
    - **status**: 新状态 (active/resolved/false_positive)
    """
    service = get_service()
    success = service.neo4j.update_chain_status(chain_id, status)

    if not success:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    return {
        "chain_id": chain_id,
        "status": status,
        "message": "Status updated successfully"
    }
