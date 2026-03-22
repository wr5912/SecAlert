# STRUCTURE.md - Directory Structure

## Planned Project Structure

```
SecAlert/
├── collector/                    # Vector-based collection
│   ├── configs/                  # Vector source configurations
│   ├── plugins/                  # Custom collector plugins
│   └── scripts/                  # Deployment scripts
│
├── parser/                       # Log parsing layer
│   ├── templates/                # Pre-built parsing templates (50+)
│   ├── drain/                    # Drain clustering engine
│   ├── dspy/                     # DSPy LLM parser
│   │   ├── signatures/           # DSPy signature definitions
│   │   ├── programs/             # DSPy program implementations
│   │   └── optimizers/          # MIPRO optimizers
│   └── registry/                 # Parser versioning & registry
│
├── stream/                       # Flink stream processing
│   ├── flink-jobs/               # Flink job definitions
│   │   ├── rules/                # Rule detection engine
│   │   ├── correlation/           # Alert correlation
│   │   └── aggregation/           # Temporal aggregation
│   └── kafka/                     # Kafka topics & consumers
│
├── storage/                      # Storage layer
│   ├── elasticsearch/             # ES indices & mappings
│   ├── clickhouse/               # CH schemas & queries
│   ├── neo4j/                    # Graph models & Cypher
│   └── minio/                    # Raw log bucket config
│
├── api/                          # API services
│   ├── rest/                     # FastAPI endpoints
│   ├── grpc/                     # gRPC services
│   └── mcp/                      # MCP Server implementation
│
├── analysis/                      # Analysis layer
│   ├── rules/                    # YAML rule definitions
│   ├── graph/                    # Graph query templates
│   └── ai/                       # AI analysis programs
│
├── web/                          # Frontend (if applicable)
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                     # End-to-end tests
│
├── docs/                         # Documentation
│   ├── 项目调研材料.md           # Research materials
│   └── 落地方案.md               # Implementation plan
│
├── .planning/                    # GSD planning artifacts
│   ├── codebase/                 # Codebase maps
│   └── roadmap/                  # Project roadmap
│
├── Dockerfile                    # Container definitions
├── docker-compose.yml             # Local development
├── k8s/                          # Kubernetes manifests
├── pyproject.toml                # Python project config
├── package.json                  # Node/TypeScript config
└── README.md                     # Project overview
```

## Key File Locations

| Purpose | Path |
|---------|------|
| Project research | `docs/项目调研材料.md` |
| Implementation plan | `docs/落地方案.md` |
| Codebase maps | `.planning/codebase/*.md` |
| Parser templates | `parser/templates/` |
| DSPy signatures | `parser/dspy/signatures/` |
| Rule definitions | `analysis/rules/*.yaml` |
| Flink jobs | `stream/flink-jobs/` |

## Naming Conventions

### Files
- Python: `snake_case.py`
- TypeScript: `camelCase.ts`
- YAML configs: `kebab-case.yaml`
- Markdown docs: `kebab-case.md`

### Directories
- Python packages: `snake_case/`
- Components: `kebab-case/`

### Code
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Variables: `camelCase` (Python) / `camelCase` (TypeScript)
