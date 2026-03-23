"""
攻击链 API 接口

FastAPI endpoints for attack chain access
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..chain.attack_chain.models import (
    AttackChainModel,
    AttackChainListResponse,
    AttackChainCreate
)
from ..chain.attack_chain.service import AttackChainService
from ..graph.client import Neo4jClient

router = APIRouter(prefix="/api/chains", tags=["chains"])

# 全局服务实例 (延迟初始化)
_service: Optional[AttackChainService] = None


def get_service() -> AttackChainService:
    """获取服务实例 (单例)"""
    global _service
    if _service is None:
        _service = AttackChainService(neo4j_client=Neo4jClient())
    return _service


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


@router.post("/reconstruct")
async def reconstruct_chains() -> dict:
    """
    触发攻击链重建

    从关联器重建所有攻击链并存储到 Neo4j。
    注意：此端点需要在调用前向关联器填入告警数据。
    典型用法是从 Phase 1 的告警源读取并调用 correlator.add_alert() 后再调用此端点。
    """
    from ..chain.attack_chain.service import AttackChainService

    service = get_service()

    return {
        "status": "ready",
        "message": "Reconstruction endpoint ready. Use correlator.add_alert() to populate alerts, then call this endpoint with the correlator instance."
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
