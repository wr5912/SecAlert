"""PDF 报表导出器

使用 WeasyPrint + Jinja2 将 HTML 模板转为 PDF
"""

import logging
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
import io

logger = logging.getLogger(__name__)

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
    try:
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
    except Exception as e:
        logger.error(f"PDF 生成失败: {e}")
        raise
