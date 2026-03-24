"""处置建议 API 接口

FastAPI endpoints for remediation recommendations
Phase 4 API endpoints - 响应平台集成

Per D-11: 提供 API 接口供威胁响应平台调用
- 攻击链详情 API（含处置建议）✓
- 告警状态查询 API ✓ (Wave 3 新增)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from src.analysis.remediation.advisor import RemediationAdvisor
from src.analysis.service import AnalysisService
from src.graph.client import Neo4jClient

router = APIRouter(prefix="/api/remediation", tags=["remediation"])

# 全局服务实例
_advisor: Optional[RemediationAdvisor] = None
_analysis_service: Optional[AnalysisService] = None


def get_advisor() -> RemediationAdvisor:
    """获取 RemediationAdvisor 实例"""
    global _advisor
    if _advisor is None:
        _advisor = RemediationAdvisor()
    return _advisor


def get_analysis_service() -> AnalysisService:
    """获取 AnalysisService 实例"""
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service


# ========== Wave 3 新增端点 ==========

@router.get("/chains")
async def list_remediation_chains(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    severity: Optional[str] = Query(default="all", pattern="^(critical|high|medium|low|all)$"),
    status: Optional[str] = Query(default="active", pattern="^(active|resolved|false_positive|all)$")
) -> dict:
    """列出攻击链（支持严重度和状态过滤）

    响应平台调用此端点获取待处理告警列表

    - **limit**: 返回数量 (1-100)
    - **offset**: 偏移量
    - **severity**: 严重度过滤 (critical,high,medium,low,all)，默认 all
    - **status**: 状态过滤 (active,resolved,false_positive,all)，默认 active

    Returns:
    - chains: 攻击链列表（只包含基本信息，不含完整告警详情）
    - total: 总数
    - limit, offset: 分页信息
    """
    neo4j = Neo4jClient()

    # 获取链列表
    if status == "all":
        chains = neo4j.list_chains(limit=limit, offset=offset)
    else:
        chains = neo4j.list_chains(limit=limit, offset=offset, status=status)

    neo4j.close()

    # 严重度过滤（前端过滤，非后端）
    if severity != "all":
        chains = [c for c in chains if c.get("max_severity") == severity]

    return {
        "chains": chains,
        "total": len(chains),
        "limit": limit,
        "offset": offset
    }


@router.get("/platform/status")
async def get_platform_status() -> dict:
    """获取平台状态

    响应平台可调用此端点检查 SecAlert 平台状态

    Returns:
    - status: "ready" | "degraded" | "error"
    - version: SecAlert 版本
    - timestamp: 当前服务器时间
    - checks: 各组件检查结果
    """
    from datetime import datetime

    try:
        # 检查 Neo4j 连接
        neo4j = Neo4jClient()
        test_result = neo4j.list_chains(limit=1, offset=0)
        neo4j.close()

        return {
            "status": "ready",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "checks": {
                "neo4j": "connected"
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "checks": {
                "neo4j": "error"
            },
            "error": str(e)
        }


# ========== Wave 1 原有端点 ==========

@router.get("/chains/{chain_id}/full")
async def get_chain_full(chain_id: str) -> dict:
    """获取攻击链完整详情（包含告警列表）

    与 /chains/{chain_id} 不同，此端点返回完整的告警列表
    用于响应平台获取完整攻击链数据

    - **chain_id**: 攻击链 ID

    Returns:
    - 完整的攻击链数据，包含所有告警详情
    """
    neo4j = Neo4jClient()
    chain_data = neo4j.get_chain_by_id(chain_id)
    neo4j.close()

    if not chain_data:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    return chain_data


@router.get("/chains/{chain_id}")
async def get_remediation(chain_id: str) -> dict:
    """获取攻击链的处置建议

    - **chain_id**: 攻击链 ID

    返回:
    - chain_id
    - severity
    - status
    - recommendation: { short_action, detailed_steps, attck_ref, source }
    - timeline: { nodes, summary }
    - asset_ip
    - src_ip
    """
    # 1. 从 Neo4j 获取链数据
    neo4j = Neo4jClient()
    chain_data = neo4j.get_chain_by_id(chain_id)
    neo4j.close()

    if not chain_data:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    # 2. 生成处置建议
    advisor = get_advisor()
    recommendation = advisor.get_recommendation(chain_data)
    timeline = advisor.get_timeline(chain_data)

    # 3. 提取源 IP
    src_ip = None
    if chain_data.get("alerts"):
        src_ip = chain_data["alerts"][0].get("src_ip")

    return {
        "chain_id": chain_id,
        "severity": chain_data.get("max_severity"),
        "status": chain_data.get("status"),
        "recommendation": recommendation,
        "timeline": timeline,
        "asset_ip": chain_data.get("asset_ip"),
        "src_ip": src_ip
    }


@router.post("/chains/{chain_id}/acknowledge")
async def acknowledge_alert(
    chain_id: str,
    note: Optional[str] = Query(default=None)
) -> dict:
    """确认已通报

    - **chain_id**: 攻击链 ID
    - **note**: 可选备注

    将攻击链状态更新为 resolved
    """
    neo4j = Neo4jClient()
    chain_data = neo4j.get_chain_by_id(chain_id)
    if not chain_data:
        neo4j.close()
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not found")

    success = neo4j.update_chain_status(chain_id, "resolved")
    neo4j.close()

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update status")

    return {
        "chain_id": chain_id,
        "status": "resolved",
        "acknowledged": True,
        "note": note
    }


@router.post("/chains/{chain_id}/restore")
async def restore_false_positive(chain_id: str) -> dict:
    """恢复误报链（与 Phase 3 的 restore_chain API 打通）

    - **chain_id**: 攻击链 ID

    将 false_positive 状态的链恢复为 active
    """
    service = get_analysis_service()
    result = service.restore_chain(chain_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
