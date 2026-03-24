"""处置建议 API 接口

FastAPI endpoints for remediation recommendations
Phase 4 API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

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
