"""报表 API 接口

FastAPI endpoints for report generation and export
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response

from src.analysis.report_aggregator import ReportAggregator, DailyMetrics
from src.exporters.pdf_exporter import generate_pdf
from src.exporters.excel_exporter import generate_excel_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])

# 全局服务实例 (延迟初始化)
_aggregator: Optional[ReportAggregator] = None


def get_aggregator() -> ReportAggregator:
    """获取 ReportAggregator 实例 (单例)"""
    global _aggregator
    if _aggregator is None:
        _aggregator = ReportAggregator()
    return _aggregator


@router.get("/trends")
async def get_alert_trends(
    days: int = Query(default=7, ge=1, le=90)
) -> List[Dict[str, Any]]:
    """获取告警趋势数据 (每日聚合)

    用于前端趋势图展示。

    Args:
        days: 获取最近 N 天的数据 (默认 7 天)

    Returns:
        [{"date": "2026-03-20", "total": 150, "false_positives": 45, "true_positives": 105}, ...]
    """
    aggregator = get_aggregator()
    trends = aggregator.get_trends(days)
    return trends


@router.get("/daily")
async def get_daily_report(
    date: Optional[str] = Query(default=None)  # YYYY-MM-DD 格式
) -> Dict[str, Any]:
    """获取指定日期的日报数据

    Args:
        date: 日期字符串 (YYYY-MM-DD)，默认为今天

    Returns:
        日报数据字典
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")
    else:
        target_date = datetime.now()

    aggregator = get_aggregator()
    metrics = aggregator.collect_daily_metrics(target_date)
    return aggregator.to_dict(metrics)


@router.get("/weekly")
async def get_weekly_report(
    start_date: Optional[str] = Query(default=None)  # YYYY-MM-DD 格式
) -> Dict[str, Any]:
    """获取指定周的周报数据 (周一为起始)

    Args:
        start_date: 周的起始日期 (YYYY-MM-DD)，默认为本周周一

    Returns:
        周报数据字典
    """
    if start_date:
        try:
            target_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")
    else:
        target_date = datetime.now()

    aggregator = get_aggregator()
    metrics = aggregator.collect_weekly_metrics(target_date)
    return metrics


@router.get("/export/pdf")
async def export_pdf_report(
    report_type: str = Query(enum=["daily", "weekly"]),
    date: Optional[str] = Query(default=None)  # YYYY-MM-DD 格式
) -> Response:
    """导出 PDF 报表

    Args:
        report_type: 报表类型 (daily 或 weekly)
        date: 日期 (默认为今天或本周)

    Returns:
        PDF 文件字节流
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")
    else:
        target_date = datetime.now()

    aggregator = get_aggregator()

    if report_type == "daily":
        metrics = aggregator.collect_daily_metrics(target_date)
        context = {
            "report_title": f"SecAlert 日报 - {metrics.date}",
            "date": metrics.date,
            "total_alerts": metrics.total_alerts,
            "total_chains": metrics.total_chains,
            "true_positives": metrics.true_positives,
            "false_positives": metrics.false_positives,
            "fp_rate": f"{metrics.fp_rate * 100:.1f}%",
            "severity_distribution": metrics.severity_distribution,
            "top_attack_types": metrics.top_attack_types
        }
        template_name = "daily_report.html"
    else:
        metrics = aggregator.collect_weekly_metrics(target_date)
        context = {
            "report_title": f"SecAlert 周报 - {metrics['week_start']} 至 {metrics['week_end']}",
            "week_start": metrics["week_start"],
            "week_end": metrics["week_end"],
            "total_alerts": metrics["total_alerts"],
            "total_chains": metrics["total_chains"],
            "true_positives": metrics["true_positives"],
            "false_positives": metrics["false_positives"],
            "fp_rate": f"{metrics['fp_rate'] * 100:.1f}%",
            "severity_distribution": metrics["severity_distribution"],
            "top_attack_types": metrics["top_attack_types"],
            "daily_breakdown": metrics.get("daily_breakdown", [])
        }
        template_name = "weekly_report.html"

    try:
        pdf_bytes = generate_pdf(template_name, context)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={report_type}_report_{date or 'current'}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"PDF 生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 生成失败: {str(e)}")


@router.get("/export/excel")
async def export_excel_report(
    report_type: str = Query(enum=["daily", "weekly"]),
    date: Optional[str] = Query(default=None)  # YYYY-MM-DD 格式
) -> Response:
    """导出 Excel 报表

    Args:
        report_type: 报表类型 (daily 或 weekly)
        date: 日期 (默认为今天或本周)

    Returns:
        Excel 文件字节流
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")
    else:
        target_date = datetime.now()

    aggregator = get_aggregator()

    if report_type == "daily":
        metrics = aggregator.collect_daily_metrics(target_date)
        excel_data = aggregator.to_dict(metrics)
    else:
        excel_data = aggregator.collect_weekly_metrics(target_date)
        excel_data["date"] = excel_data["week_start"]

    try:
        excel_bytes = generate_excel_report(excel_data, report_type)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={report_type}_report_{date or 'current'}.xlsx"
            }
        )
    except Exception as e:
        logger.error(f"Excel 生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"Excel 生成失败: {str(e)}")
