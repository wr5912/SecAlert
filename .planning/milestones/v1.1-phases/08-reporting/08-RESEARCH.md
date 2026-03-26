# Phase 8: 报表 - Research

**研究日期:** 2026-03-25
**Domain:** 报表生成与导出技术
**Confidence:** MEDIUM (基于代码库分析和训练数据知识)

## Summary

Phase 8 需要实现日报/周报自动生成、告警趋势分析、数据源健康报表和 PDF/Excel 导出功能。现有系统已有 `FalsePositiveMetricsCollector` 和基础 `/api/analysis/metrics/*` 端点，支持基本的严重度分布和误报率统计。报表功能需要在现有 Neo4j 存储层基础上扩展时间序列聚合查询，并新增定时调度和文件导出能力。

**核心推荐:** 后端生成 PDF/Excel + 前端图表展示，APScheduler 定时调度，Jinja2 模板生成 PDF，openpyxl 生成 Excel。

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RP-01 | 日报自动生成 | 后端 APScheduler 每日 08:00 执行，使用 Jinja2 模板生成 HTML 转 PDF |
| RP-02 | 周报统计报表 | 复用日报数据聚合，支持 7d/30d 时间范围，openpyxl 导出 Excel |
| RP-03 | 告警趋势分析图 | 前端 Recharts 折线图，后端提供趋势数据 API 聚合 |
| RP-04 | 数据源健康报表 | 新增数据源状态追踪，Neo4j 存储健康数据，生成健康度指标 |
| RP-05 | 报表导出功能（PDF/Excel） | WeasyPrint 后端 PDF 生成，openpyxl Excel 生成，前端下载 |

---

## User Constraints (from CONTEXT.md)

> **Note:** CONTEXT.md 不存在，Phase 8 是新建 phase，无预定义约束。下方基于项目整体约束推断。

### 项目级约束
- **私有化离线部署:** 禁止使用外部云服务，所有数据存储在本地
- **AI 推理:** 基于私有化 Qwen3-32B，无外部 API 依赖
- **技术栈:** Python 3.10+, FastAPI, Neo4j, React (前端)

### 技术约束推断
- PDF 生成必须在后端完成（私有化环境无外部 PDF 服务）
- Excel 导出可选择前端或后端（根据复杂度决定）
- 定时任务需要内嵌调度器，不依赖外部任务队列

---

## Standard Stack

### Core Dependencies (Python Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **APScheduler** | 3.10+ | 定时任务调度 | 轻量级、无需外部 broker、内嵌在 FastAPI 进程中 |
| **WeasyPrint** | 54+ | HTML 转 PDF | 纯 Python、支持 CSS 布局、与 Jinja2 无缝集成 |
| **Jinja2** | 3.1+ | 模板引擎 | Python 事实标准模板库、WeasyPrint 原生支持 |
| **openpyxl** | 3.1+ | Excel xlsx 生成 | 最完整 Python Excel 支持、读取写入均可 |
| **python-dateutil** | 2.8+ | 日期处理 | 已有依赖（pyproject.toml），处理时间范围 |

### Supporting Dependencies (Python Backend)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| **reportlab** | 备选 PDF 生成 | WeasyPrint 不可用时的低级 API |
| **pandas** | 数据聚合 | 复杂统计报表的数据处理 |
| **matplotlib** | 后端图表生成 | 需要在 PDF 中嵌入趋势图（非前端渲染） |

### Frontend Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Recharts** | 2.12+ | 图表库 | 已有推荐（STACK.md），React 原生、TypeScript 支持好 |
| **xlsx** | 0.18+ | 前端 Excel 导出 | SheetJS 社区版，轻量、浏览器端直接生成 |
| **jspdf** | 2.5+ | 前端 PDF 导出 | 仅用于简单报表，复杂 PDF 仍以后端为主 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| APScheduler | Celery Beat | Celery 需要 Redis/RabbitMQ broker，增加复杂度；APScheduler 足够单实例使用 |
| WeasyPrint | ReportLab | ReportLab API 更底层，需要更多代码；WeasyPrint 用 CSS 布局更直观 |
| WeasyPrint | wkhtmltopdf | wkhtmltopdf 需要外部二进制，Docker 部署复杂；WeasyPrint 纯 Python |
| openpyxl | xlsxwriter | xlsxwriter 只支持写入不支持读取；openpyxl 功能更全 |
| 前端 xlsx | 后端 openpyxl | 前端导出用户体验更好（无需等待服务器），但复杂报表仍需后端 |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── api/
│   ├── reports.py          # NEW: 报表 API endpoints
│   ├── main.py             # 已注册 reports router
├── analysis/
│   ├── metrics.py          # 已有: FalsePositiveMetricsCollector
│   ├── metrics_collector.py # NEW: 扩展指标收集器
│   └── report_scheduler.py # NEW: APScheduler 定时任务
├── templates/
│   └── reports/            # NEW: Jinja2 报表模板
│       ├── daily_report.html
│       └── weekly_report.html
├── exporters/              # NEW: 导出器
│   ├── pdf_exporter.py
│   └── excel_exporter.py
frontend/src/
├── pages/
│   └── ReportsPage.tsx     # NEW: 报表页面
├── components/
│   ├── charts/             # NEW: 图表组件
│   │   ├── TrendChart.tsx
│   │   ├── SeverityPieChart.tsx
│   │   └── TopAttackTypesBar.tsx
│   └── reports/            # NEW: 报表组件
│       ├── ReportFilters.tsx
│       └── ExportButton.tsx
```

### Pattern 1: 后端报表生成 (Report Generation Pipeline)

**What:** 定时任务触发报表生成，存储到本地文件系统或 MinIO

**When to use:** 日报周报自动生成、复杂 PDF 报表

**Example:**
```python
# src/analysis/report_scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job(CronTrigger(hour=8, minute=0))
async def generate_daily_report():
    """每日 08:00 生成日报"""
    # 1. 收集数据
    metrics = await collect_daily_metrics()

    # 2. 渲染模板
    html_content = render_template("daily_report.html", {
        "date": datetime.now().date(),
        "metrics": metrics
    })

    # 3. 生成 PDF
    pdf_bytes = generate_pdf(html_content)

    # 4. 存储
    await store_report(pdf_bytes, f"daily_{date}.pdf")

def render_template(template_name: str, context: dict) -> str:
    """使用 Jinja2 渲染报表模板"""
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    env = Environment(
        loader=FileSystemLoader("src/templates/reports"),
        autoescape=select_autoescape(['html', 'xml'])
    )
    template = env.get_template(template_name)
    return template.render(**context)
```

### Pattern 2: 前端趋势图数据聚合 (Trend Aggregation)

**What:** 后端提供预聚合的时间序列数据，前端 Recharts 渲染

**When to use:** 告警趋势分析、实时仪表板

**Example:**
```python
# src/api/reports.py
@router.get("/api/reports/trends")
async def get_alert_trends(
    days: int = Query(default=7, ge=1, le=90)
) -> List[Dict[str, Any]]:
    """获取告警趋势数据 (每日聚合)"""
    # Neo4j 时间范围查询
    query = """
        MATCH (c:AttackChain)
        WHERE c.start_time >= datetime() - duration({{'days': days}})
        RETURN c.start_time.date() as date,
               count(c) as total,
               sum(case when c.status = 'false_positive' then 1 else 0 end) as false_positives,
               sum(case when c.status = 'active' then 1 else 0 end) as true_positives
        ORDER BY date
    """
    # 返回: [{"date": "2026-03-20", "total": 150, "false_positives": 45, "true_positives": 105}, ...]
```

### Pattern 3: Excel 导出 (Excel Export Pipeline)

**What:** 使用 openpyxl 生成结构化 Excel 报表

**When to use:** 数据导出、领导汇报、跨部门共享

**Example:**
```python
# src/exporters/excel_exporter.py
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

def generate_weekly_excel_report(metrics: WeeklyMetrics) -> bytes:
    """生成周报 Excel"""
    wb = Workbook()
    ws = wb.active
    ws.title = "周报摘要"

    # 表头样式
    header_fill = PatternFill("solid", fgColor="4472C4")
    header_font = Font(color="FFFFFF", bold=True)

    # 写入数据
    headers = ["日期", "总告警", "真威胁", "误报", "误报率"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font

    for row, day_data in enumerate(metrics.daily_breakdown, 2):
        ws.cell(row=row, column=1, value=day_data["date"])
        ws.cell(row=row, column=2, value=day_data["total"])
        ws.cell(row=row, column=3, value=day_data["true_positives"])
        ws.cell(row=row, column=4, value=day_data["false_positives"])
        ws.cell(row=row, column=5, value=f"{day_data['fp_rate']:.1f}%")

    # 自动列宽
    for column in ws.columns:
        ws.column_dimensions[column[0].column_letter].width = 12

    from io import BytesIO
    output = BytesIO()
    wb.save(output)
    return output.getvalue()
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF 布局渲染 | 手写 PDF 指令坐标 | WeasyPrint + HTML/CSS | CSS 布局更易维护，模板可分离 |
| 定时调度 | while loop + time.sleep | APScheduler | 支持 cron 表达式、持久化、异常处理 |
| Excel 格式控制 | CSV 导出 | openpyxl | 支持样式、公式、多 Sheet、单元格合并 |
| 日期时间计算 | datetime.strftime 拼接 | python-dateutil | 已有依赖，支持自然语言解析和时区 |

**Key insight:** 报表导出是成熟领域，第三方库覆盖 95% 需求，自研投入产出比低。

---

## Common Pitfalls

### Pitfall 1: 报表数据量过大导致内存溢出
**What goes wrong:** 一次性加载 30 天数据生成 PDF，内存占用过高
**Why it happens:** Neo4j 查询未分页，Python 数据结构未流式处理
**How to avoid:** 分批查询 + 流式 PDF 生成 + 设置超时
**Warning signs:** `MemoryError`、API 请求超时、生成时间 > 30s

### Pitfall 2: 定时任务重复执行
**What goes wrong:** FastAPI 重载时 APScheduler 任务被触发多次
**Why it happens:** 未使用 `AsyncIOScheduler` 单一实例，或重复调用 `scheduler.start()`
**How to avoid:** 在 FastAPI lifespan 中管理 scheduler 生命周期，确保单例
**Warning signs:** 同一报表生成多次、数据库连接池耗尽

### Pitfall 3: PDF 中文显示为方块
**What goes wrong:** WeasyPrint 缺少中文字体，汉字无法渲染
**Why it happens:** 容器镜像未包含中文字体
**How to avoid:** 在 Dockerfile 中安装字体：`apt-get install fonts-noto-cjk`
**Warning signs:** PDF 打开后中文显示为空心方框

### Pitfall 4: 时区不一致导致报表数据错天
**What goes wrong:** 日报 08:00 生成，但统计的是 UTC 0 点而非本地 0 点数据
**Why it happens:** Neo4j datetime 默认 UTC，Python datetime 未指定时区
**How to avoid:** 统一使用 UTC 存储，业务层转换时区；或明确指定报表时区
**Warning signs:** 报表数据与 UI 显示不一致、连续两天数据重复或缺失

---

## Code Examples

### 报表数据聚合查询 (Neo4j)

```python
# 获取时间范围内的攻击链统计
def get_chains_in_timerange(
    self,
    start_date: datetime,
    end_date: datetime,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """获取指定时间范围内的攻击链"""
    query = """
        MATCH (c:AttackChain)
        WHERE c.start_time >= datetime($start_date)
          AND c.start_time < datetime($end_date)
    """
    params = {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()}

    if status:
        query += " AND c.status = $status"
        params["status"] = status

    query += """
        RETURN c.chain_id,
               c.start_time,
               c.max_severity,
               c.status,
               c.alert_count,
               c.asset_ip
        ORDER BY c.start_time DESC
    """

    with self.driver.session() as session:
        result = session.run(query, **params)
        return [dict(record) for record in result]
```

### APScheduler 集成 FastAPI

```python
# src/analysis/service.py 或新建 report_scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

def setup_report_scheduler(app: FastAPI):
    """在 FastAPI lifespan 中调用"""
    scheduler.add_job(
        generate_daily_report,
        CronTrigger(hour=8, minute=0, timezone="Asia/Shanghai"),
        id="daily_report",
        replace_existing=True
    )
    scheduler.add_job(
        generate_weekly_report,
        CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="Asia/Shanghai"),
        id="weekly_report",
        replace_existing=True
    )
    scheduler.start()

async def shutdown_scheduler():
    scheduler.shutdown(wait=False)
```

### 前端趋势图组件 (Recharts)

```typescript
// frontend/src/components/charts/TrendChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendData {
  date: string;
  total: number;
  truePositives: number;
  falsePositives: number;
}

export function TrendChart({ data }: { data: TrendData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" stroke="#8884d8" name="总告警" />
        <Line type="monotone" dataKey="truePositives" stroke="#82ca9d" name="真威胁" />
        <Line type="monotone" dataKey="falsePositives" stroke="#ffc658" name="误报" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|--------------|--------|
| 手动生成报表 | APScheduler 自动定时 | 2020+ | 节省人工、保证时效 |
| 服务器端渲染图表 | 前端 Recharts 交互式图表 | 2019+ | 更好的用户体验 |
| 服务器端 Excel | 前端 SheetJS 即时导出 | 2020+ | 减少服务器负载 |
| ReportLab 手写坐标 | WeasyPrint HTML/CSS | 2015+ | 模板易维护 |
| Celery + RabbitMQ | APScheduler 单进程 | 2018+ | 部署简单 |

**Deprecated/outdated:**
- **wkhtmltopdf**: 需要系统依赖，Dockfile 复杂，已被 WeasyPrint 取代
- **CSV 导出**: 无法保留格式，Excel 导出已足够简单
- **Pandas Excel**: 依赖 openpyxl 但 API 复杂，直接用 openpyxl 更透明

---

## Open Questions

1. **报表存储位置**
   - What we know: 需要存储生成的 PDF/Excel 文件
   - What's unclear: 存放在本地文件系统还是 MinIO？是否需要版本管理？
   - Recommendation: 初期存放在 `storage/reports/` 目录，按日期组织；后续可迁移至 MinIO

2. **数据源健康报表的具体指标**
   - What we know: Phase 5 会新增多数据源支持
   - What's unclear: DS-06 健康监控的具体指标？告警延迟？丢失率？
   - Recommendation: 等待 Phase 5 规划明确，或在 Phase 8 规划时与 DS-06 对齐

3. **报表访问控制**
   - What we know: 当前 API 无权限验证
   - What's unclear: 是否需要角色权限？报表是否需要审批流程？
   - Recommendation: 初期不做权限控制，作为内部工具；后续企业版需求再扩展

---

## Environment Availability

> Step 2.6: SKIPPED (无外部依赖，报表功能基于现有 Python/FastAPI 技术栈实现)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.10+ | 后端报表服务 | ✓ | 3.10+ | — |
| Neo4j | 数据存储 | ✓ | 5.18 | — |
| Jinja2 | 模板渲染 | ✓ | 3.1+ | — |
| APScheduler | 定时调度 | ✗ (需安装) | 3.10+ | — |
| WeasyPrint | PDF 生成 | ✗ (需安装) | 54+ | ReportLab |
| openpyxl | Excel 生成 | ✗ (需安装) | 3.1+ | — |

**Missing dependencies with no fallback:**
- APScheduler、WeasyPrint、openpyxl 为新增依赖，需要在 `pyproject.toml` 中添加

**Missing dependencies with fallback:**
- WeasyPrint 可用 ReportLab 替代，但 WeasyPrint 更适合 HTML 模板场景

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (已有) |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `pytest tests/test_reports.py -x` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RP-01 | 日报定时生成 | unit + integration | `pytest tests/test_reports.py::test_daily_report_generation -x` | ❌ Wave 0 |
| RP-02 | 周报统计正确 | unit | `pytest tests/test_reports.py::test_weekly_metrics_aggregation -x` | ❌ Wave 0 |
| RP-03 | 趋势 API 返回正确格式 | unit | `pytest tests/test_reports.py::test_trends_api -x` | ❌ Wave 0 |
| RP-04 | 数据源健康状态追踪 | unit | `pytest tests/test_reports.py::test_datasource_health -x` | ❌ Wave 0 |
| RP-05 | PDF/Excel 导出 | unit + file verify | `pytest tests/test_reports.py::test_pdf_export -x` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `tests/test_reports.py` — 覆盖 RP-01~RP-05 全部测试用例
- [ ] `tests/conftest.py` — 共享 fixtures (mock Neo4j, sample metrics data)
- [ ] `src/analysis/report_scheduler.py` — APScheduler 调度器
- [ ] `src/api/reports.py` — 报表 API endpoints
- [ ] `src/exporters/` — PDF/Excel 导出器
- [ ] `src/templates/reports/` — Jinja2 报表模板

*(如果 Wave 0 完成后，所有缺失文件应被标记为 ✅)*

---

## Sources

### Primary (HIGH confidence)
- **APScheduler 文档:** https://apscheduler.readthedocs.io/ (官方文档)
- **WeasyPrint 官方:** https://weasyprint.org/ (官方文档)
- **openpyxl 文档:** https://openpyxl.readthedocs.io/ (官方文档)
- **Recharts 文档:** https://recharts.org (官方文档)

### Secondary (MEDIUM confidence)
- **FastAPI 定时任务模式:** 基于 FastAPI 最佳实践文档
- **Neo4j 时间查询:** 基于 Neo4j Python Driver 文档

### Tertiary (LOW confidence)
- **Jinja2 + WeasyPrint 集成模式:** 基于训练数据知识，建议验证中文渲染配置

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - APScheduler/WeasyPrint/openpyxl 均为成熟库，但需验证版本兼容性
- Architecture: MEDIUM - 推荐架构基于现有系统扩展，需 Phase 5 多数据源规划完成后对齐
- Pitfalls: MEDIUM - 常见陷阱基于同类项目经验，中文字体问题需实际验证

**Research date:** 2026-03-25
**Valid until:** 2026-05-25 (30天后需重新验证依赖版本)
