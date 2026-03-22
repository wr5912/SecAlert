# STACK.md - Technology Stack

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

```txt
# AI Framework
dspy>=2.0.0
vllm>=0.3.0

# Data Processing
pandas>=2.0.0
numpy>=1.24.0

# API
fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0

# Storage Clients
elasticsearch>=8.0.0
neo4j>=5.0.0
clickhouse-driver>=0.2.0
minio>=7.0.0

# Utilities
PyYAML>=6.0
python-dateutil>=2.8.0
```

## Configuration

- **YAML** - Primary configuration format for rules and pipelines
- **Environment Variables** - Secrets and deployment-specific settings
- **JSON** - Event schemas and API payloads

## Notes

- All AI inference runs offline with privately deployed Qwen3-32B
- Enterprise/private deployment constraint requires no external cloud dependencies
- 国产数据库 support required: 达梦 (DM), TiDB, openGauss, Kingbase
