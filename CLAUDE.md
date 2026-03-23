## 语言规范
- 所有对话和回复必须使用中文
- 所有代码注释使用中文
- 所有文档编写使用中文

<!-- GSD:project-start source:PROJECT.md -->
## Project

**SecAlert**

智能网络安全告警分析系统——帮助企业普通IT运维人员（非专业安全分析师）自动过滤海量告警，只呈现真正需要关注的安全威胁。

每天数万条异构安全设备告警，系统自动分析、自动判断误报、自动还原攻击链，运维人员只需处理真正有威胁的几条/几十条告警。

**Core Value:** **帮助非专业运维人员自动过滤海量告警，只呈现真正需要关注的安全威胁。**

一切设计以此为纲：误报自动忽略、只报警真实攻击、界面极度简单、操作极度自动化。

### Constraints

- **Tech**: 私有化离线部署，无外部云依赖
- **Performance**: 每天处理3万+条告警，延迟可接受
- **User**: 非专业运维人员，界面必须极度简单
- **AI**: 所有AI推理基于私有化Qwen3-32B
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtimes
| Component | Language | Version | Notes |
|-----------|----------|---------|-------|
| AI/DSPy | Python | 3.10+ | DSPy framework for LLM tasks |
| Stream Processing | Java/Scala | 17+ | Flink |
| Collector | Rust | 1.70+ | Vector SDK |
| API Service | Python/Go | 3.10+/1.20+ | FastAPI or gRPC |
| MCP Server | TypeScript | Node 18+ | For AI Agent integration |
## Frameworks & Libraries
### AI/ML Layer
- **DSPy** - Signature-driven LLM programming framework
- **vLLM** - Offline LLM inference (Qwen3-32B)
- **MIPRO** - Bayesian optimizer for DSPy prompt compilation
### Stream Processing
- **Apache Flink** - Real-time stream processing engine
- **Apache Kafka** / **Pulsar** - Message queue for event streaming
### Data Storage
- **Elasticsearch** - Full-text search and event storage
- **ClickHouse** - OLAP aggregation and analytics
- **Neo4j** / **NebulaGraph** - Graph database for entity relationships
- **MinIO** - S3-compatible object storage for raw logs
### Collection & Ingestion
- **Vector** - Unified data collection framework
- **JDBC** - Database connectivity for polling-based collection
### API & Integration
- **FastAPI** / **gRPC** - REST and RPC API endpoints
- **MCP Server** - Model Context Protocol for AI Agent integration
### Data Formats
- **OCSF** (Open Cybersecurity Schema Framework) - Standard event format
- **ECS** (Elastic Common Schema) - Elasticsearch compatible schema
- **CEF** (Common Event Format) - Legacy syslog format
## Infrastructure
- **Kubernetes** - Container orchestration (enterprise deployment)
- **Docker** - Container runtime
## Development Tools
| Tool | Purpose |
|------|---------|
| Python 3.10+ | Primary development language |
| Java 17+ | Flink stream processing |
| Rust 1.70+ | Vector collector |
| Go 1.20+ | High-performance API services |
## Key Dependencies (Python)
# AI Framework
# Data Processing
# API
# Storage Clients
# Utilities
## Configuration
- **YAML** - Primary configuration format for rules and pipelines
- **Environment Variables** - Secrets and deployment-specific settings
- **JSON** - Event schemas and API payloads
## Notes
- All AI inference runs offline with privately deployed Qwen3-32B
- Enterprise/private deployment constraint requires no external cloud dependencies
- 国产数据库 support required: 达梦 (DM), TiDB, openGauss, Kingbase
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language-Specific Standards
### Python (Primary Language)
### Java/Scala (Flink)
### Rust (Vector)
### TypeScript (MCP Server)
## Error Handling
### Python
### Go
## Configuration Patterns
### YAML Rules
### Environment Variables
## Data Formats
### OCSF Standard Event
## DSPy Patterns
### Signature Definition
### Program Implementation
## Documentation
### Docstrings (Python)
## Git Conventions
- Branch naming: `feature/`, `fix/`, `refactor/`
- Commit messages: Conventional Commits
- PR description: Include test plan
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Architecture Pattern
```
```
## Data Flow
```
```
## Layer Responsibilities
### Collection Layer (Collector)
- Unified collection via Vector framework
- Source-specific adapters (JDBC, REST, file, syslog)
- Protocol conversion to Kafka
### Parser Layer
- Three-tier parsing: Template → Drain → DSPy/LLM
- Parser registry with versioning
- Self-iteration feedback loop
### Stream Processing Layer
- Flink-based real-time processing
- Alert correlation and aggregation
- Entity linking and temporal analysis
### Storage Layer
- Elasticsearch: Search and retrieval
- ClickHouse: OLAP aggregations
- Neo4j: Entity relationship graphs
- MinIO: Raw log archive
### Analysis Layer
- Rule engine for signature detection
- Graph queries for attack path analysis
- DSPy AI for complex analysis tasks
## Key Abstractions
### DSPy Unified AI Framework
```
```
### Data Model (Four Layers)
| Layer | Content | Storage |
|-------|---------|---------|
| Raw | 原始日志全文 | MinIO |
| Normalized | OCSF/ECS 格式 | Elasticsearch |
| Enriched | +威胁情报 +ATT&CK | Elasticsearch |
| Graph | 实体关系 + 时序链 | Neo4j |
## Entry Points
| Component | Entry Point | Purpose |
|-----------|-------------|---------|
| Vector | Configuration YAML | Data ingestion |
| Kafka | Topic: `raw-events` | Message intake |
| Flink | Stream processing job | Real-time analysis |
| API | FastAPI/gRPC endpoints | External access |
| MCP | Server port | AI Agent integration |
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
