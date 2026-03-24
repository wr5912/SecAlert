# Milestone v1.0 — Project Summary

**Generated:** 2026-03-24
**Purpose:** Team onboarding and project review

---

## 1. Project Overview

**SecAlert** — 智能网络安全告警分析系统

帮助企业普通IT运维人员（非专业安全分析师）自动过滤海量告警，只呈现真正需要关注的安全威胁。

每天数万条异构安全设备告警，系统自动分析、自动判断误报、自动还原攻击链，运维人员只需处理真正有威胁的几条/几十条告警。

**Core Value:** 帮助非专业运维人员自动过滤海量告警，只呈现真正需要关注的安全威胁。

**Target Users:** 企业普通IT运维人员，网络安全知识有限，非专业安全分析师

**Milestone Status:** 4/4 phases complete — v1.0 交付完成

---

## 2. Architecture & Technical Decisions

**Key architectural pattern：** 规则优先 + LLM 兜底（三层解析架构）

| 决策 | 理由 | 阶段 |
|------|------|------|
| 分析工具定位 | 非专业用户，不能做自动处置，风险太大 | Phase 04 |
| 误报自动忽略 | 运维人员不胜烦扰，自动过滤是核心价值 | Phase 03 |
| Qwen3-32B 统一推理 | 离线部署，无外部API依赖 | Phase 01 |
| 三层解析架构 | 模板优先 → Drain聚类 → LLM兜底，平衡性能与准确性 | Phase 01 |
| 攻击链级别判断 | 不是单条告警，链内多条告警联合判断 | Phase 03 |
| 攻击链存储策略 | Neo4j 图数据库存储攻击链，Alert 节点关联 AttackChain 节点 | Phase 02 |
| Docker Compose 本地开发 | 单命令启动全部6个服务 | Phase 01 |
| Confluent Kafka 7.5.0 | 成熟稳定的 Kafka 发行版 | Phase 01 |
| Elasticsearch 8.11.0 单节点 | 本地开发无需集群 | Phase 01 |
| 置信度 < 0.5 自动误报 | Critical/High 严重度豁免 | Phase 03 |
| 四档分级 | Critical/High/Medium/Low | Phase 03 |
| ATT&CK 严重度基准 + 上下文 | 技术基准 + 上下文系数调整 | Phase 03 |
| 处置建议规则优先 + LLM 兜底 | 命中有模板的 technique_id 时直接填充，模板未命中时调用 DSPy LLM 生成 | Phase 04 |

**Tech Stack:**
- Python 3.10+ (Primary language)
- DSPy (LLM programming framework)
- Apache Kafka (Message queue)
- Elasticsearch 8.11.0 (Full-text search and storage)
- Neo4j (Graph database for attack chains)
- Redis (Caching and deduplication)
- PostgreSQL 16 (Relational data)
- Vector 0.34.0 (Log collection)
- React + TypeScript (Frontend)

---

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 01 | Foundation & Ingestion | ✅ Complete | 基础设施：Docker Compose + Kafka + Elasticsearch + Redis + PostgreSQL + Vector，日志摄取管道 |
| 02 | Attack Chain Correlation | ✅ Complete | 攻击链关联：ATT&CK 映射 + 动态窗口关联器 + Neo4j 存储 + REST API |
| 03 | Core Analysis Engine | ✅ Complete | 核心分析：DSPy 分类器（规则优先 + LLM 兜底）+ 严重度评分（ATT&CK 基准）+ 误报率指标 |
| 04 | Recommendations & Polish | ✅ Complete | 处置建议：RemediationAdvisor（模板 + DSPy LLM）+ React 前端（AlertList/AlertDetail 单屏）+ 响应平台 API |

**Plan Execution:**
- Phase 1: 5/5 plans executed
- Phase 2: 4/4 plans executed
- Phase 3: 3/3 plans executed
- Phase 4: 3/3 plans executed
- **Total: 15/15 plans executed**

---

## 4. Requirements Coverage

| Requirement | ID | Phase | Status |
|-------------|-----|-------|--------|
| 系统能自动识别和解析未知格式的安全设备日志 | PARSE-01 | Phase 1 | ✅ 实现 |
| 系统能还原攻击链，呈现完整的攻击路径 | CHAIN-01 | Phase 2 | ✅ 实现 |
| 系统能自动过滤误报，直接忽略 | FILTER-01 | Phase 3 | ✅ 实现 |
| 系统能检测真实攻击并报警 | DETECT-01 | Phase 3 | ✅ 实现 |
| 系统能给出简单明确的处置建议 | REMED-01 | Phase 4 | ✅ 实现 |
| 界面简洁，面向非专业运维人员 | UI-01 | Phase 4 | ✅ 实现 |

**Coverage: 6/6 requirements mapped and verified**

---

## 5. Key Decisions Log

### Phase 01 — Foundation & Ingestion

| ID | Decision | Rationale |
|----|----------|-----------|
| — | Confluent Kafka 7.5.0 | 成熟稳定的 Kafka 发行版 |
| — | Elasticsearch 8.11.0 单节点 | 本地开发无需集群 |
| — | Vector 0.34.0 | 统一日志收集框架 |
| — | PostgreSQL 16-alpine | 轻量级数据库镜像 |
| — | Redis 7-alpine (LRU) | 缓存去重状态 |

### Phase 02 — Attack Chain Correlation

| ID | Decision | Rationale |
|----|----------|-----------|
| — | Neo4j 存储攻击链 | 图数据库擅长关系查询和路径分析 |
| — | 动态时间窗口关联 | 自动适应不同攻击类型的典型时间跨度 |
| — | ATT&CK Tactic/Technique 映射 | 标准化攻击分类，便于理解和响应 |

### Phase 03 — Core Analysis Engine

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | 攻击链级别判断 | 不是单条告警，链内多条告警联合判断更准确 |
| D-02 | 规则优先 + LLM 兜底 | 与 Phase 1/2 架构一致，性能与准确性平衡 |
| D-03 | 置信度 0.0-1.0 | 连续分数，DSPy 兼容 |
| D-04 | 置信度 < 0.5 自动误报 | Critical/High 严重度豁免，避免漏报高危攻击 |
| D-07 | 四档分级 | Critical/High/Medium/Low，符合行业惯例 |
| D-08 | ATT&CK 严重度基准 + 上下文 | 技术基准 + 上下文系数调整，动态适应场景 |

### Phase 04 — Recommendations & Polish

| ID | Decision | Rationale |
|----|----------|-----------|
| D-09 | 处置建议规则优先 + LLM 兜底 | 命中有模板的 technique_id 时直接填充，模板未命中时调用 DSPy LLM 生成 |
| — | 简化线性时间线 | 4 节点展示，非专业运维人员一眼看懂 |
| — | 单屏设计 | AlertDetail 单屏包含所有信息，无需导航 |

---

## 6. Tech Debt & Deferred Items

**Known Issues:**
- dspy-ai stub 包兼容性：需要 `hasattr(dspy, 'Signature')` 检测真正的 dspy-ai 实现
- 26 个单元测试通过，覆盖 classifier、severity、metrics 模块

**Deferred / Out of Scope:**
- 自动响应/自动阻断 — 系统只报警，不自动处置
- 专业安全分析师工具 — 用户是普通IT运维，不是安全专家
- 实时阻断防护 — 分析工具定位，不做边界防护
- 国产数据库支持（达梦、TiDB、openGauss、Kingbase）— 未来版本

**Data Model Notes:**
- 四层数据模型：Raw (MinIO) → Normalized OCSF/ECS (Elasticsearch) → Enriched + 威胁情报 (Elasticsearch) → Graph 实体关系 (Neo4j)

---

## 7. Getting Started

**Run the project:**
```bash
cd /home/admin/work/SecAlert
docker-compose up -d  # Start all 6 services
```

**Key directories:**
```
src/
  analysis/           # DSPy 分类器和严重度评分
  chain/              # 攻击链关联和存储
  api/                # FastAPI REST 端点
  graph/              # Neo4j 客户端
frontend/             # React + TypeScript 前端
rules/                # ATT&CK 映射规则、处置建议模板
tests/                # 单元测试
docker-compose.yml    # 6-service orchestration
```

**Entry points:**
- Vector 配置: `vector.yaml` — 日志摄取入口
- Kafka Topic: `raw-events` — 消息队列入口
- FastAPI: `src/api/` — REST API 端点
- MCP Server: TypeScript — AI Agent 集成

**Tests:**
```bash
pytest tests/test_analysis/ -x -q --tb=short
# 26 tests pass
```

**关键文件：**
- `docker-compose.yml` — 基础设施
- `src/analysis/classifier/programs.py` — 分类器核心
- `src/analysis/service.py` — 分析服务
- `frontend/src/App.tsx` — 前端入口

---

## Stats

- **Timeline:** 2026-03-22 → 2026-03-24 (2 days)
- **Phases:** 4/4 complete
- **Plans:** 15/15 executed
- **Commits:** ~108
- **Requirements:** 6/6 mapped and verified
- **Contributors:** Wuying Created Local Users

---

## Phase-by-Phase Summary

### Phase 01 — Foundation & Ingestion

创建 Docker Compose 本地开发环境，包含 6 个服务（Kafka、Zookeeper、Elasticsearch、Redis、PostgreSQL、Vector）。

**关键文件:**
- `docker-compose.yml`
- `.env`
- `pyproject.toml`

### Phase 02 — Attack Chain Correlation

实现攻击链关联引擎，包括 ATT&CK Mapper、Alert Correlator（动态窗口 + 规则）、Neo4j 存储、REST API。

**关键文件:**
- `src/chain/`
- `src/graph/client.py`
- `rules/attck_suricata.yaml` (12 条映射规则)

### Phase 03 — Core Analysis Engine

实现 DSPy 分类器（规则优先 + LLM 兜底）、ATT&CK 严重度评分、四档分级（Critical/High/Medium/Low）、误报率指标追踪。

**关键文件:**
- `src/analysis/classifier/signatures.py`
- `src/analysis/classifier/programs.py`
- `src/analysis/classifier/severity.py`
- `src/analysis/service.py`

### Phase 04 — Recommendations & Polish

实现处置建议生成（RemediationAdvisor + 模板库 + DSPy LLM）、React 前端（AlertList + AlertDetail 单屏 + ChainTimeline + RemediationPanel）、响应平台 API。

**关键文件:**
- `src/analysis/remediation/advisor.py`
- `src/analysis/remediation/templates.py`
- `rules/remediation_templates.yaml` (5 个 technique 模板)
- `frontend/src/App.tsx`
- `src/api/remediation_endpoints.py` (6 个 API 端点)

---

*Summary generated from: ROADMAP.md, STATE.md, PROJECT.md, REQUIREMENTS.md, and 15 phase plan SUMMARY files.*
