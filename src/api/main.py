"""
SecAlert API 主入口

FastAPI 应用入口，注册所有路由
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.chain_endpoints import router as chain_router
from src.api.remediation_endpoints import router as remediation_router
from src.analysis.api import router as analysis_router

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("SecAlert API 启动中...")

    # 初始化 Neo4j 约束
    try:
        from src.graph.client import Neo4jClient
        neo4j = Neo4jClient()
        neo4j.ensure_constraints()
        neo4j.close()
        logger.info("Neo4j 约束初始化完成")
    except Exception as e:
        logger.warning(f"Neo4j 初始化警告: {e}")

    yield

    logger.info("SecAlert API 关闭中...")


# 创建 FastAPI 应用
app = FastAPI(
    title="SecAlert API",
    description="智能网络安全告警分析系统 API",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chain_router)
app.include_router(remediation_router)
app.include_router(analysis_router)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "SecAlert API"}


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "SecAlert API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
