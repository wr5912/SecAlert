# Phase 8: 报表

---
phase: 08-reporting
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pyproject.toml
  - frontend/package.json
  - src/api/reports.py
  - src/analysis/report_aggregator.py
autonomous: true
requirements:
  - RP-01
  - RP-02
  - RP-03
  - RP-05
user_setup:
  - service: fonts
    why: "WeasyPrint PDF 中文渲染需要 CJK 字体"
    action: "确认容器镜像已安装 fonts-noto-cjk 或在 Dockerfile 中添加"

must_haves:
  truths:
    - "系统每日自动生成日报"
    - "系统每周自动生成周报"
    - "用户可以查看告警趋势分析图"
    - "用户可以导出 PDF/Excel 报表"
  artifacts:
    - path: "src/api/reports.py"
      provides: "报表 API endpoints"
      exports: ["GET /api/reports/trends", "GET /api/reports/daily", "GET /api/reports/weekly"]
    - path: "src/analysis/report_aggregator.py"
      provides: "报表数据聚合逻辑"
      contains: "class ReportAggregator"
    - path: "src/analysis/report_scheduler.py"
      provides: "APScheduler 定时调度"
      contains: "AsyncIOScheduler"
    - path: "src/templates/reports/"
      provides: "Jinja2 报表模板"
      contains: "daily_report.html, weekly_report.html"
    - path: "src/exporters/pdf_exporter.py"
      provides: "PDF 导出"
      contains: "generate_pdf"
    - path: "src/exporters/excel_exporter.py"
      provides: "Excel 导出"
      contains: "generate_excel"
    - path: "frontend/src/components/charts/TrendChart.tsx"
      provides: "趋势图组件"
      exports: "TrendChart"
  key_links:
    - from: "src/analysis/report_scheduler.py"
      to: "src/analysis/report_aggregator.py"
      via: "collect_daily_metrics() 调用"
    - from: "src/api/reports.py"
      to: "src/analysis/report_aggregator.py"
      via: "ReportAggregator 依赖注入"
    - from: "frontend/src/pages/ReportsPage.tsx"
      to: "/api/reports/trends"
      via: "fetch 趋势数据"
    - from: "frontend/src/components/charts/TrendChart.tsx"
      to: "recharts"
      via: "LineChart import"
---

<objective>
实现报表功能基础架构，包括日报/周报自动生成、趋势分析 API、PDF/Excel 导出能力。
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/analysis/metrics.py
@src/api/main.py
@src/graph/client.py
@.planning/phases/08-reporting/08-RESEARCH.md
</context>

<interfaces>
<!-- 现有系统接口，本计划新增代码依赖这些接口 -->

From src/graph/client.py:
```python
class Neo4jClient:
    def list_chains(self, limit: int = 100, status: Optional[str] = None) -> List[Dict[str, Any]]: ...
    def get_chain(self, chain_id: str) -> Optional[Dict[str, Any]]: ...
```

From src/analysis/metrics.py:
```python
class FalsePositiveMetricsCollector:
    def calculate_fp_rate(self, time_window_hours: int = 24) -> FalsePositiveMetrics: ...
    def get_severity_distribution(self, status: Optional[str] = "active") -> Dict[str, int]: ...
```

From src/api/main.py:
```python
# FastAPI app 实例和路由注册模式
app = FastAPI(...)
app.include_router(chain_router)
app.include_router(remediation_router)
app.include_router(analysis_router)
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: 添加报表依赖到 pyproject.toml 和 frontend/package.json</name>
  <files>pyproject.toml, frontend/package.json</files>
  <read_first>
    pyproject.toml
    frontend/package.json
  </read_first>
  <action>
    在 pyproject.toml 添加新依赖组 [project.optional-dependencies]:

    ```toml
    reporting = [
        "apscheduler>=3.10.0",
        "weasyprint>=54.0",
        "openpyxl>=3.1.0",
        "jinja2>=3.1.0",
    ]
    ```

    将 "reporting" 添加到现有的 ai、chain 等依赖组旁边。

    在 frontend/package.json dependencies 中添加:

    ```json
    "recharts": "^2.12.0",
    "xlsx": "^0.18.5",
    "jspdf": "^2.5.1"
    ```
  </action>
  <acceptance_criteria>
    - grep "apscheduler" pyproject.toml 返回 1+ 行
    - grep "weasyprint" pyproject.toml 返回 1+ 行
    - grep "openpyxl" pyproject.toml 返回 1+ 行
    - grep "recharts" frontend/package.json 返回 1+ 行
  </acceptance_criteria>
  <done>pyproject.toml 包含 reporting 依赖组，frontend/package.json 包含 Recharts</done>
</task>

<task type="auto">
  <name>Task 2: 创建报表 API 路由 (src/api/reports.py)</name>
  <files>src/api/reports.py</files>
  <read_first>
    src/api/main.py
    src/api/chain_endpoints.py
  </read_first>
  <action>
    创建 src/api/reports.py，实现以下 endpoints:

    ```python
    from fastapi import APIRouter, Query
    from typing import List, Dict, Any
    from datetime import datetime, timedelta

    router = APIRouter(prefix="/api/reports", tags=["reports"])

    @router.get("/trends")
    async def get_alert_trends(
        days: int = Query(default=7, ge=1, le=90)
    ) -> List[Dict[str, Any]]:
        """获取告警趋势数据 (每日聚合)

        Returns: [{"date": "2026-03-20", "total": 150, "false_positives": 45, "true_positives": 105}, ...]
        """

    @router.get("/daily")
    async def get_daily_report(
        date: str = Query(default=None)  # YYYY-MM-DD 格式
    ) -> Dict[str, Any]:
        """获取指定日期的日报数据"""

    @router.get("/weekly")
    async def get_weekly_report(
        start_date: str = Query(default=None)  # YYYY-MM-DD 格式
    ) -> Dict[str, Any]:
        """获取指定周的周报数据 (周一为起始)"""

    @router.get("/export/pdf")
    async def export_pdf_report(
        report_type: str = Query(enum=["daily", "weekly"]),
        date: str = Query(default=None)
    ) -> bytes:
        """导出 PDF 报表，返回 PDF bytes"""

    @router.get("/export/excel")
    async def export_excel_report(
        report_type: str = Query(enum=["daily", "weekly"]),
        date: str = Query(default=None)
    ) -> bytes:
        """导出 Excel 报表，返回 xlsx bytes"""
    ```

    实现类: ReportAggregator，依赖 Neo4jClient
    使用 python-dateutil 处理日期计算（已有依赖）
  </action>
  <acceptance_criteria>
    - grep "class ReportAggregator" src/analysis/report_aggregator.py 返回 1+ 行
    - grep "@router.get" src/api/reports.py 返回 5+ 个路由
    - grep "trends" src/api/reports.py 返回包含 "/trends" 的行
    - grep "export" src/api/reports.py 返回包含 "/export/pdf" 和 "/export/excel" 的行
  </acceptance_criteria>
  <done>报表 API 路由已创建，包含趋势、日报、周报、PDF/Excel 导出端点</done>
</task>

<task type="auto">
  <name>Task 3: 创建报表数据聚合器 (src/analysis/report_aggregator.py)</name>
  <files>src/analysis/report_aggregator.py</files>
  <read_first>
    src/analysis/metrics.py
    src/graph/client.py
  </read_first>
  <action>
    创建 src/analysis/report_aggregator.py，实现 ReportAggregator 类:

    ```python
    from typing import Dict, Any, List, Optional
    from datetime import datetime, timedelta
    from dataclasses import dataclass

    @dataclass
    class DailyMetrics:
        date: str
        total_alerts: int
        total_chains: int
        true_positives: int
        false_positives: int
        fp_rate: float
        severity_distribution: Dict[str, int]
        top_attack_types: List[Dict[str, Any]]

    class ReportAggregator:
        """报表数据聚合器

        从 Neo4j 聚合告警数据，生成日报/周报所需指标
        """

        def collect_daily_metrics(self, date: datetime) -> DailyMetrics:
            """收集指定日期的指标数据"""

        def collect_weekly_metrics(self, start_date: datetime) -> Dict[str, Any]:
            """收集指定周的指标数据 (周一到周日)"""

        def get_trends(self, days: int) -> List[Dict[str, Any]]:
            """获取每日趋势数据 (用于图表)"""
    ```

    Neo4j 查询模式:
    - 使用 duration() 计算时间范围
    - 按日期分组聚合 count(), sum(case when ...)
    - 复用 FalsePositiveMetricsCollector 的 get_severity_distribution() 逻辑
  </action>
  <acceptance_criteria>
    - grep "class ReportAggregator" src/analysis/report_aggregator.py 返回 1 行
    - grep "class DailyMetrics" src/analysis/report_aggregator.py 返回 1 行
    - grep "collect_daily_metrics" src/analysis/report_aggregator.py 返回 1+ 行
    - grep "get_trends" src/analysis/report_aggregator.py 返回 1+ 行
  </acceptance_criteria>
  <done>ReportAggregator 类可从 Neo4j 聚合数据生成 DailyMetrics 和趋势数据</done>
</task>

<task type="auto">
  <name>Task 4: 创建 PDF 导出器 (src/exporters/pdf_exporter.py)</name>
  <files>src/exporters/pdf_exporter.py</files>
  <read_first>
    src/analysis/report_aggregator.py
  </read_first>
  <action>
    创建目录 src/exporters/__init__.py 和 src/exporters/pdf_exporter.py:

    ```python
    """PDF 报表导出器

    使用 WeasyPrint + Jinja2 将 HTML 模板转为 PDF
    """
    from typing import Dict, Any
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from weasyprint import HTML, CSS
    import io

    TEMPLATES_DIR = "src/templates/reports"

    def generate_pdf(
        template_name: str,
        context: Dict[str, Any]
    ) -> bytes:
        """生成 PDF 报表

        Args:
            template_name: Jinja2 模板文件名
            context: 模板上下文数据

        Returns:
            PDF 字节数据
        """
        # 渲染 Jinja2 模板
        env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(['html', 'xml'])
        )
        template = env.get_template(template_name)
        html_content = template.render(**context)

        # 转换为 PDF
        html = HTML(string=html_content)
        output = io.BytesIO()
        html.write_pdf(output)
        return output.getvalue()
    ```

    同时创建 src/templates/reports/daily_report.html 基础模板:
    - 包含表头 "SecAlert 日报 - {date}"
    - 包含指标卡片: 总告警数、真威胁数、误报数、误报率
    - 包含严重度分布表格
    - 使用 CSS 样式，确保中文渲染 (font-family: "Noto CJK SC", sans-serif)
  </action>
  <acceptance_criteria>
    - grep "def generate_pdf" src/exporters/pdf_exporter.py 返回 1+ 行
    - grep "from weasyprint import" src/exporters/pdf_exporter.py 返回 1+ 行
    - grep "daily_report.html" src/templates/reports/ 返回存在（使用 Glob）
    - 文件 src/exporters/pdf_exporter.py 存在且可导入
  </acceptance_criteria>
  <done>PDF 导出器可通过 Jinja2 模板生成 PDF，包含中文字体支持</done>
</task>

<task type="auto">
  <name>Task 5: 创建 Excel 导出器 (src/exporters/excel_exporter.py)</name>
  <files>src/exporters/excel_exporter.py</files>
  <read_first>
    src/analysis/report_aggregator.py
  </read_first>
  <action>
    创建 src/exporters/excel_exporter.py:

    ```python
    """Excel 报表导出器

    使用 openpyxl 生成 xlsx 格式报表
    """
    from typing import Dict, Any, List
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from io import BytesIO

    def generate_excel_report(
        metrics: Dict[str, Any],
        report_type: str = "daily"
    ) -> bytes:
        """生成 Excel 报表

        Args:
            metrics: 报表数据
            report_type: "daily" 或 "weekly"

        Returns:
            xlsx 字节数据
        """
        wb = Workbook()

        # Sheet 1: 摘要
        ws_summary = wb.active
        ws_summary.title = "摘要"

        # 样式定义
        header_fill = PatternFill("solid", fgColor="4472C4")
        header_font = Font(color="FFFFFF", bold=True)
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # 写入表头
        headers = ["指标", "数值"]
        for col, header in enumerate(headers, 1):
            cell = ws_summary.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.border = thin_border

        # 写入数据行
        summary_data = [
            ("日期", metrics.get("date", "")),
            ("总告警", metrics.get("total_alerts", 0)),
            ("总链数", metrics.get("total_chains", 0)),
            ("真威胁", metrics.get("true_positives", 0)),
            ("误报", metrics.get("false_positives", 0)),
            ("误报率", f"{metrics.get('fp_rate', 0):.1f}%"),
        ]

        for row, (key, value) in enumerate(summary_data, 2):
            ws_summary.cell(row=row, column=1, value=key).border = thin_border
            ws_summary.cell(row=row, column=2, value=value).border = thin_border

        # 自动列宽
        ws_summary.column_dimensions['A'].width = 15
        ws_summary.column_dimensions['B'].width = 15

        # Sheet 2: 每日明细 (用于周报)
        if report_type == "weekly" and "daily_breakdown" in metrics:
            ws_detail = wb.create_sheet("每日明细")
            # 写入每日数据...

        output = BytesIO()
        wb.save(output)
        return output.getvalue()
    ```
  </action>
  <acceptance_criteria>
    - grep "def generate_excel_report" src/exporters/excel_exporter.py 返回 1+ 行
    - grep "from openpyxl import" src/exporters/excel_exporter.py 返回 1+ 行
    - grep "Workbook" src/exporters/excel_exporter.py 返回 1+ 行
    - 文件 src/exporters/excel_exporter.py 存在且可导入
  </acceptance_criteria>
  <done>Excel 导出器可生成带样式的 xlsx 报表，包含摘要 Sheet</done>
</task>

<task type="auto">
  <name>Task 6: 创建趋势图组件 (frontend/src/components/charts/TrendChart.tsx)</name>
  <files>frontend/src/components/charts/TrendChart.tsx</files>
  <read_first>
    frontend/src/App.tsx
    frontend/src/components/AlertList.tsx
  </read_first>
  <action>
    创建目录 frontend/src/components/charts/ 和 frontend/src/pages/，创建文件:

    1. frontend/src/components/charts/TrendChart.tsx:
    ```typescript
    import {
      LineChart,
      Line,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      Legend,
      ResponsiveContainer
    } from 'recharts';

    interface TrendData {
      date: string;
      total: number;
      truePositives: number;
      falsePositives: number;
    }

    interface TrendChartProps {
      data: TrendData[];
    }

    export function TrendChart({ data }: TrendChartProps) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8884d8"
              name="总告警"
            />
            <Line
              type="monotone"
              dataKey="truePositives"
              stroke="#82ca9d"
              name="真威胁"
            />
            <Line
              type="monotone"
              dataKey="falsePositives"
              stroke="#ffc658"
              name="误报"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    ```

    2. frontend/src/pages/ReportsPage.tsx (基础页面框架):
    ```typescript
    import { useState, useEffect } from 'react';
    import { TrendChart } from '../components/charts/TrendChart';

    interface TrendData {
      date: string;
      total: number;
      truePositives: number;
      falsePositives: number;
    }

    export function ReportsPage() {
      const [trends, setTrends] = useState<TrendData[]>([]);

      useEffect(() => {
        fetch('/api/reports/trends?days=7')
          .then(res => res.json())
          .then(setTrends)
          .catch(console.error);
      }, []);

      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">报表中心</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">告警趋势 (近7天)</h2>
            <TrendChart data={trends} />
          </div>
        </div>
      );
    }
    ```

    在 App.tsx 添加 ReportsPage 路由或导航链接（根据 Phase 6 UI 框架决定）
  </action>
  <acceptance_criteria>
    - grep "export function TrendChart" frontend/src/components/charts/TrendChart.tsx 返回 1+ 行
    - grep "LineChart" frontend/src/components/charts/TrendChart.tsx 返回 1+ 行
    - grep "ResponsiveContainer" frontend/src/components/charts/TrendChart.tsx 返回 1+ 行
    - grep "export function ReportsPage" frontend/src/pages/ReportsPage.tsx 返回 1+ 行
  </acceptance_criteria>
  <done>TrendChart 组件可渲染趋势折线图，ReportsPage 页面可获取并展示数据</done>
</task>

</tasks>

<verification>
- pyproject.toml 包含 apscheduler, weasyprint, openpyxl
- frontend/package.json 包含 recharts
- src/api/reports.py 存在且包含 5 个路由
- src/analysis/report_aggregator.py 存在且包含 ReportAggregator 类
- src/exporters/pdf_exporter.py 存在且可生成 PDF
- src/exporters/excel_exporter.py 存在且可生成 Excel
- frontend/src/components/charts/TrendChart.tsx 存在
- frontend/src/pages/ReportsPage.tsx 存在
</verification>

<success_criteria>
- 报表 API 可响应 GET /api/reports/trends
- ReportAggregator 可从 Neo4j 聚合数据
- PDF 导出器可生成中文 PDF
- Excel 导出器可生成格式化的 xlsx
- TrendChart 组件可渲染 Recharts 图表
</success_criteria>

<output>
完成后创建 .planning/phases/08-reporting/08-01-SUMMARY.md
</output>
