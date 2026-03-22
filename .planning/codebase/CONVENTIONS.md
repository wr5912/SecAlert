# CONVENTIONS.md - Coding Conventions

## Language-Specific Standards

### Python (Primary Language)

**Style Guide**: PEP 8 with Black formatting

```python
# Imports order: stdlib → third-party → local
import os
import sys
from datetime import datetime

import pandas as pd
from pydantic import BaseModel

from parser.dspy.signatures import LogParserSignature


# Class naming: PascalCase
class AlertAnalyzer:
    def __init__(self, config: dict) -> None:
        self.config = config
        self._private_cache = {}

    # Methods: snake_case
    def analyze_alert(self, alert_event: dict) -> dict:
        return {}


# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
```

**Type Hints**: Required for function signatures

```python
def parse_log(raw_log: str, source_type: str) -> dict[str, Any]:
    ...
```

**Async Patterns**:
```python
async def fetch_events(start_time: datetime, end_time: datetime) -> list[dict]:
    ...
```

### Java/Scala (Flink)

**Style**: Standard Java conventions with Kettle

```java
public class AlertCorrelator {
    private final DataStream<Alert> alertStream;

    public List<Alert> correlate(Collection<Alert> alerts) {
        return alerts.stream()
            .filter(this::isValid)
            .collect(Collectors.toList());
    }
}
```

### Rust (Vector)

**Style**: Standard Rust conventions (rustfmt)

```rust
pub struct CollectorConfig {
    pub name: String,
    pub source_type: SourceType,
}

impl CollectorConfig {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            source_type: SourceType::Unknown,
        }
    }
}
```

### TypeScript (MCP Server)

**Style**: Standard TypeScript with ESLint

```typescript
interface AlertEvent {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AlertService {
  public async analyze(event: AlertEvent): Promise<AnalysisResult> {
    return {} as AnalysisResult;
  }
}
```

## Error Handling

### Python
```python
class ParserError(Exception):
    """Raised when log parsing fails."""
    pass

try:
    result = parse_log(raw_log)
except ParserError as e:
    logger.error(f"Parsing failed: {e}")
    raise
```

### Go
```go
func (p *Parser) Parse(raw []byte) (*Event, error) {
    if len(raw) == 0 {
        return nil, fmt.Errorf("empty input")
    }
    // ...
}
```

## Configuration Patterns

### YAML Rules
```yaml
rules:
  - name: "暴力破解检测"
    condition: |
      event.type == "auth_failure"
      AND count > 5 WITHIN 5min BY src_ip
    severity: high
    mitre_tactics: [TA0001]
```

### Environment Variables
```bash
# Required env vars
export DM_HOST="192.168.1.100"
export DM_PORT="5236"
export KAFKA_BOOTSTRAP="kafka:9092"

# Optional with defaults
export LOG_LEVEL="INFO"
export FLINK parallelism="4"
```

## Data Formats

### OCSF Standard Event
```json
{
  "event_id": "uuid",
  "timestamp": "2026-03-22T10:00:00Z",
  "source_type": "firewall",
  "source_name": "fw-edge-01",
  "network": {
    "src_ip": "192.168.1.100",
    "dst_ip": "10.0.0.1"
  },
  "security": {
    "severity": "high",
    "action": "deny"
  }
}
```

## DSPy Patterns

### Signature Definition
```python
class LogParserSignature(dspy.Signature):
    raw_logs = dspy.InputField(desc="3-5条原始日志示例")
    source_type = dspy.InputField(desc="数据源类型描述")

    regex_pattern = dspy.OutputField(desc="Python正则，包含命名捕获组")
    field_mappings = dspy.OutputField(desc="字段映射字典")
    confidence = dspy.OutputField(desc="置信度 0-1")
```

### Program Implementation
```python
class LogParserProgram(dspy.Module):
    def __init__(self):
        super().__init__()
        self.generate = dspy.Treact(LogParserSignature)

    def forward(self, raw_logs: list[str], source_type: str = "未知"):
        result = self.generate(
            raw_logs="\n".join(raw_logs),
            source_type=source_type
        )
        return result
```

## Documentation

### Docstrings (Python)
```python
def calculate_risk_score(entity: Entity, context: dict) -> float:
    """
    Calculate risk score for an entity based on behavior history.

    Args:
        entity: The entity to score
        context: Additional context including alerts and history

    Returns:
        Risk score between 0.0 and 100.0

    Raises:
        ValueError: If entity has no behavior history
    """
    pass
```

## Git Conventions

- Branch naming: `feature/`, `fix/`, `refactor/`
- Commit messages: Conventional Commits
- PR description: Include test plan
