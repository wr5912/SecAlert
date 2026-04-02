# Milestones

## v1.5 多源异构安全日志采集优化 🚧

**Started:** 2026-04-02

**Phases:** 4 (Phase 16~19)

**Requirements:** 7 (MC-01~03, SM-01~02, GM-01~02)

**Target features:**
- 多渠道接入后端：Kafka Topic 订阅、Webhook 接收网关、REST API / 数据库定时轮询
- 采集监控与 DLQ：死信队列（解析失败日志不丢失）、EPS 监控、采集延迟告警
- 全局元数据体系：强制 vendor_name / product_name / device_type + OCSF target + tenant_id / environment

---

## v1.4 数据接入前端界面 (Shipped: 2026-04-02)

**Phases completed:** 2 phases, 12 plans, 34 tasks

**Key accomplishments:**

- 为数据接入模块创建测试基础设施，10 个测试用例覆盖模板 CRUD 和向导流程
- 数据源模板 CRUD API 实现，支持创建/读取/更新/删除/列表操作
- 数据接入向导 UI 和模板管理页面实现，支持 4 步骤创建数据源模板
- DI-07 AI 自动识别功能：用户提供 3-5 条示例日志，系统自动识别日志格式（CEF/Syslog/JSON/Custom），推荐 OCSF 统一字段映射，返回置信度评分
- 拖拽式字段映射 UI + 实时预览：DraggableField、FieldMapper、MappingPreview 三个组件完整实现
- 批量导入设备列表，支持 CSV/Excel 格式，统一应用模板配置
- 问题:
- 统一 field_mappings 方向为 {sourceField: OCSFField}，添加 detected_fields 字段，修复 templateId 异步 race condition
- preview-parse 端点集成 ThreeTierParser，批量导入增强文件验证，Step5-Step6 数据流明确化
- 状态管理策略文档化：

---

## v1.3 Claude Code AI 后端 (Shipped: 2026-04-01)

**Phases completed:** 1 phases, 3 plans, 12 tasks

**Key accomplishments:**

- claude-agent-sdk 集成完成，Agent 配置模块、自定义安全工具、MCP Server 注册、流式对话客户端封装均已实现
- WebSocket 流式对话端点和 Fallback 机制实现完成，Agent 路由已注册到 FastAPI
- 创建 Agent 模块完整测试套件，验证工具注册、客户端、WebSocket 端点和 Fallback 机制

---

## v1.2 智能分析工作台 (Shipped: 2026-03-30)

**Phases completed:** 4 phases, 5 plans, 43 tasks

**Key accomplishments:**

- React Flow 攻击链路图 + Zustand 全局状态 + 完整分析工作台前端框架（9个可视化组件、5个页面路由）
- 修复所有 pre-existing TypeScript 编译错误，确保前端构建通过
- Tactical Command Center 设计系统基础设施完成 - CSS 变量、字体包、4 个视觉组件、Badge 和 StatCard 升级
- 完成 Card、Button、AlertList、Header、Input、Select、Dialog、Tooltip、Charts 和 AIPanel 组件的 Tactical Command Center 视觉升级

---

## v1.1 多数据源支持 + 产品级 UI + AI 助手 (Shipped: 2026-03-25)

**Phases completed:** 4 phases, 5 plans, 43 tasks

**Key accomplishments:**

- React Flow 攻击链路图 + Zustand 全局状态 + 完整分析工作台前端框架（9个可视化组件、5个页面路由）
- 修复所有 pre-existing TypeScript 编译错误，确保前端构建通过
- Phase:
- Tactical Command Center 设计系统基础设施完成 - CSS 变量、字体包、4 个视觉组件、Badge 和 StatCard 升级
- 完成 Card、Button、AlertList、Header、Input、Select、Dialog、Tooltip、Charts 和 AIPanel 组件的 Tactical Command Center 视觉升级

---

## v1.1 多数据源支持 + 产品级 UI + AI 助手 (Shipped: 2026-03-25)

**Phases completed:** 8 phases, 22 plans, 50 tasks

**Key accomplishments:**

- Docker Compose with 6 infrastructure services (Kafka, Elasticsearch, Redis, PostgreSQL, Vector, Zookeeper) for local development
- Vector agent configured to receive Suricata BSD syslog via TCP on port 514 and reliably deliver events to Kafka topic raw-suricata with acks: all
- Three-tier parsing pipeline implemented: template matching (Tier 1) -> Drain clustering (Tier 2) -> DSPy/LLM fallback (Tier 3), with Suricata EVE JSON template
- PostgreSQL alerts table with UUID PK, JSONB storage, Redis 24h deduplication, and Suricata-to-OCSF mapper implemented
- None
- Plan:
- Plan:
- DSPy 分类器和严重度评分模块：攻击链级别误报过滤（规则优先 + LLM 兜底），置信度 0.5 阈值，ATT&CK 技术严重度基准
- AnalysisService 分析服务（Neo4j 读取 + 分类 + 软删除）+ FalsePositiveMetricsCollector 误报率统计（< 30% 目标判断）
- 分析层 REST API 端点 + 分类器/严重度/指标单元测试
- 计划:
- React + TypeScript 前端项目，包含告警列表、详情单屏、时间线和处置建议组件
- 响应平台 API 端点扩展完成：列表查询、状态检查、完整告警获取；前端已抑制 Tab 支持恢复功能
- AI助手对话框界面、上下文动态关联、流式响应和历史持久化实现完成。
- NL查询意图识别路由 + 自然语言处置建议生成：用户可以用自然语言查询告警（"查询最近1小时Critical告警"），AI理解意图调用API并返回格式化结果
- APScheduler 定时调度器实现，日报每日 08:00、周报每周一 09:00 自动生成，集成到 FastAPI lifespan
- 一句话：

---

## v1.0 MVP (Shipped: 2026-03-25)

**Phases completed:** 4 phases, 15 plans, 39 tasks

**Key accomplishments:**

- Docker Compose with 6 infrastructure services (Kafka, Elasticsearch, Redis, PostgreSQL, Vector, Zookeeper) for local development
- Vector agent configured to receive Suricata BSD syslog via TCP on port 514 and reliably deliver events to Kafka topic raw-suricata with acks: all
- Three-tier parsing pipeline implemented: template matching (Tier 1) -> Drain clustering (Tier 2) -> DSPy/LLM fallback (Tier 3), with Suricata EVE JSON template
- PostgreSQL alerts table with UUID PK, JSONB storage, Redis 24h deduplication, and Suricata-to-OCSF mapper implemented
- None
- Plan:
- Plan:
- DSPy 分类器和严重度评分模块：攻击链级别误报过滤（规则优先 + LLM 兜底），置信度 0.5 阈值，ATT&CK 技术严重度基准
- AnalysisService 分析服务（Neo4j 读取 + 分类 + 软删除）+ FalsePositiveMetricsCollector 误报率统计（< 30% 目标判断）
- 分析层 REST API 端点 + 分类器/严重度/指标单元测试
- 计划:
- React + TypeScript 前端项目，包含告警列表、详情单屏、时间线和处置建议组件
- 响应平台 API 端点扩展完成：列表查询、状态检查、完整告警获取；前端已抑制 Tab 支持恢复功能

---
