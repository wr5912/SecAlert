"""SecAlert 分析层 REST API

提供攻击链分类、误报管理、指标统计接口
Phase 3 API endpoints
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query

from src.analysis.service import AnalysisService
from src.analysis.metrics import FalsePositiveMetricsCollector


logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# 初始化服务
_service: Optional[AnalysisService] = None
_metrics: Optional[FalsePositiveMetricsCollector] = None


def get_service() -> AnalysisService:
    """获取或创建 AnalysisService 实例"""
    global _service
    if _service is None:
        _service = AnalysisService()
    return _service


def get_metrics() -> FalsePositiveMetricsCollector:
    """获取或创建 FalsePositiveMetricsCollector 实例"""
    global _metrics
    if _metrics is None:
        _metrics = FalsePositiveMetricsCollector()
    return _metrics


# ========== 分类接口 ==========

@router.post("/chains/{chain_id}/classify")
async def classify_chain(chain_id: str) -> Dict[str, Any]:
    """对攻击链进行分类

    Args:
        chain_id: 攻击链 ID

    Returns:
        分类结果
    """
    service = get_service()
    result = service.classify_chain(chain_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/chains/batch-classify")
async def batch_classify(chain_ids: List[str]) -> List[Dict[str, Any]]:
    """批量分类攻击链

    Args:
        chain_ids: 攻击链 ID 列表

    Returns:
        分类结果列表
    """
    service = get_service()
    return service.batch_classify(chain_ids)


# ========== 误报管理接口 ==========

@router.get("/chains/false-positives")
async def list_false_positives(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
) -> Dict[str, Any]:
    """获取误报链列表

    Args:
        limit: 返回数量限制
        offset: 偏移量

    Returns:
        误报链列表和总数
    """
    service = get_service()
    chains = service.list_false_positives(limit=limit, offset=offset)

    return {
        "chains": chains,
        "total": len(chains),
        "limit": limit,
        "offset": offset
    }


@router.post("/chains/{chain_id}/restore")
async def restore_chain(chain_id: str) -> Dict[str, Any]:
    """恢复误报链

    Args:
        chain_id: 攻击链 ID

    Returns:
        恢复结果
    """
    service = get_service()
    result = service.restore_chain(chain_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# ========== 指标统计接口 ==========

@router.get("/metrics/fp-rate")
async def get_fp_rate(
    time_window_hours: int = Query(default=24, ge=1, le=168)
) -> Dict[str, Any]:
    """获取误报率统计

    Args:
        time_window_hours: 统计时间窗口（小时）

    Returns:
        误报率指标
    """
    metrics = get_metrics()
    result = metrics.calculate_fp_rate(time_window_hours=time_window_hours)

    return {
        "fp_rate": result.fp_rate,
        "fp_rate_percent": result.fp_rate_percent,
        "total_chains": result.total_chains,
        "false_positives": result.false_positives,
        "true_positives": result.true_positives,
        "target_met": result.target_met,
        "time_window_hours": result.time_window_hours,
        "calculated_at": result.calculated_at
    }


@router.get("/metrics/severity-distribution")
async def get_severity_distribution(
    status: Optional[str] = Query(default="active", regex="^(active|resolved|false_positive)$")
) -> Dict[str, int]:
    """获取严重度分布

    Args:
        status: 过滤状态

    Returns:
        严重度分布 {"critical": N, "high": N, "medium": N, "low": N}
    """
    metrics = get_metrics()
    return metrics.get_severity_distribution(status=status)


@router.get("/metrics/suppression-log")
async def get_suppression_log(
    limit: int = Query(default=100, ge=1, le=500)
) -> List[Dict[str, Any]]:
    """获取抑制日志

    Args:
        limit: 返回条数

    Returns:
        抑制日志列表
    """
    metrics = get_metrics()
    return metrics.get_suppression_log(limit=limit)
