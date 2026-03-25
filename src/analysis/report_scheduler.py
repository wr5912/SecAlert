"""报表定时调度器

使用 APScheduler 实现日报/周报自动生成
"""
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.analysis.report_aggregator import ReportAggregator
from src.exporters.pdf_exporter import generate_pdf

logger = logging.getLogger(__name__)

# 单一 scheduler 实例
scheduler = AsyncIOScheduler()

# 报表存储路径
REPORTS_DIR = "storage/reports"


async def generate_daily_report():
    """每日 08:00 生成日报"""
    logger.info("开始生成日报...")
    try:
        # 1. 收集昨日数据
        yesterday = datetime.now() - timedelta(days=1)
        aggregator = ReportAggregator()
        metrics = aggregator.collect_daily_metrics(yesterday)

        # 2. 渲染 PDF
        context = {
            "date": yesterday.strftime("%Y-%m-%d"),
            "metrics": metrics.__dict__ if hasattr(metrics, '__dict__') else metrics,
            "generated_at": datetime.now().isoformat()
        }
        pdf_bytes = generate_pdf("daily_report.html", context)

        # 3. 保存到文件
        import os
        os.makedirs(REPORTS_DIR, exist_ok=True)
        filename = f"{REPORTS_DIR}/daily_{yesterday.strftime('%Y%m%d')}.pdf"
        with open(filename, "wb") as f:
            f.write(pdf_bytes)

        logger.info(f"日报生成完成: {filename}")
    except Exception as e:
        logger.error(f"日报生成失败: {e}", exc_info=True)


async def generate_weekly_report():
    """每周一 09:00 生成周报"""
    logger.info("开始生成周报...")
    try:
        # 1. 计算上周时间范围 (周一到周日)
        today = datetime.now()
        # 找到上周一
        days_since_monday = today.weekday()
        last_monday = today - timedelta(days=days_since_monday + 7)

        aggregator = ReportAggregator()
        metrics = aggregator.collect_weekly_metrics(last_monday)

        # 2. 渲染 PDF
        context = {
            "start_date": last_monday.strftime("%Y-%m-%d"),
            "end_date": (last_monday + timedelta(days=6)).strftime("%Y-%m-%d"),
            "metrics": metrics,
            "generated_at": datetime.now().isoformat()
        }
        pdf_bytes = generate_pdf("weekly_report.html", context)

        # 3. 保存
        import os
        os.makedirs(REPORTS_DIR, exist_ok=True)
        filename = f"{REPORTS_DIR}/weekly_{last_monday.strftime('%Y%m%d')}.pdf"
        with open(filename, "wb") as f:
            f.write(pdf_bytes)

        logger.info(f"周报生成完成: {filename}")
    except Exception as e:
        logger.error(f"周报生成失败: {e}", exc_info=True)


def setup_scheduler():
    """配置定时任务并启动调度器"""
    scheduler.add_job(
        generate_daily_report,
        CronTrigger(hour=8, minute=0, timezone="Asia/Shanghai"),
        id="daily_report",
        replace_existing=True,
        misfire_grace_time=3600  # 允许1小时内的错过触发
    )
    scheduler.add_job(
        generate_weekly_report,
        CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="Asia/Shanghai"),
        id="weekly_report",
        replace_existing=True,
        misfire_grace_time=3600
    )
    scheduler.start()
    logger.info("报表调度器已启动")


def shutdown_scheduler():
    """关闭调度器"""
    scheduler.shutdown(wait=False)
    logger.info("报表调度器已关闭")