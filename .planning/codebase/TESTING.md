# TESTING.md - Testing Strategy

## Test Pyramid

```
           ┌─────────────┐
           │     E2E     │  ← 5%
           ├─────────────┤
           │ Integration │  ← 25%
           ├─────────────┤
           │    Unit     │  ← 70%
           └─────────────┘
```

## Unit Tests

### Python (pytest)

**Location**: `tests/unit/`

```python
# tests/unit/test_log_parser.py
import pytest
from parser.dspy import LogParserProgram

class TestLogParser:
    @pytest.fixture
    def parser(self):
        return LogParserProgram()

    def test_parse_firewall_log(self, parser):
        raw_logs = [
            "2026-03-22 10:00:00 FW DENY TCP 192.168.1.100:443 -> 10.0.0.1:8080"
        ]
        result = parser.forward(raw_logs, source_type="firewall")
        assert result.regex_pattern is not None
        assert result.confidence > 0.5

    def test_invalid_log_format(self, parser):
        with pytest.raises(ValueError):
            parser.forward([], source_type="unknown")
```

**Coverage Target**: 80%+ for core modules

### Rust (Vector plugins)

```rust
// src/parser/tests.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_syslog_message() {
        let raw = b"<134>Mar 22 10:00:00 host sshd: Accepted publickey for user";
        let result = parse_syslog(raw);
        assert!(result.is_ok());
    }
}
```

## Integration Tests

### Python

```python
# tests/integration/test_kafka_pipeline.py
import pytest
from kafka import KafkaConsumer

class TestKafkaPipeline:
    def test_event_flow(self, kafka_consumer, sample_event):
        # Produce event
        producer.send("raw-events", sample_event)
        producer.flush()

        # Consume and verify
        messages = consumer.poll(timeout_ms=5000)
        assert len(messages) > 0
```

### Flink Integration

```java
// stream/flink-jobs/src/test/java/com/secAlert/FlinkJobTest.java
public class FlinkJobTest {
    @Test
    public void testAlertCorrelation() throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        DataStream<Alert> alerts = env.fromCollection(testAlerts);

        AlertCorrelator correlator = new AlertCorrelator();
        DataStream<AttackChain> chains = correlator.correlate(alerts);

        // Assert results
    }
}
```

## E2E Tests

### Critical Paths

| Path | Description |
|------|-------------|
| Log Ingestion | Raw log → Parsed → Stored |
| Alert Detection | Event → Rule match → Alert |
| Attack Chain | Multi-alert → Chain → Visualization |

### Test Infrastructure

```yaml
# docker-compose.test.yml
services:
  test-runner:
    image: secalert/test-runner
    depends_on:
      - kafka
      - elasticsearch
      - neo4j

  kafka:
    image: confluentinc/cp-kafka:latest

  elasticsearch:
    image: elasticsearch:8.0.0

  neo4j:
    image: neo4j:5.0
```

## Mocking Strategy

### Python
```python
# Mocking external services
@pytest.fixture
def mock_vllm_client():
    with patch('dspy.ChainOfThought') as mock:
        yield mock

# Mock Kafka
@pytest.fixture
def mock_kafka_consumer():
    return MagicMock(spec=KafkaConsumer)
```

### Database Testing
```python
# Use test containers for integration tests
@pytest.fixture(scope="module")
def elasticsearch():
    with TestContainer(ElasticsearchContainer()) as es:
        yield es
```

## Performance Testing

### Load Testing
```python
# tests/performance/test_throughput.py
def test_parser_throughput():
    logs = generate_test_logs(count=100000)
    start = time.time()

    for log in logs:
        parser.parse(log)

    elapsed = time.time() - start
    rate = len(logs) / elapsed

    assert rate > 10000, f"Throughput {rate} < 10000 logs/sec"
```

## CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run unit tests
        run: pytest tests/unit -v --cov
      - name: Run integration tests
        run: pytest tests/integration -v
```

## Test Data Management

### Fixtures Location
```
tests/
├── fixtures/
│   ├── logs/              # Sample log files
│   ├── alerts/            # Alert JSON samples
│   └── configs/           # Test configurations
```

### Generating Test Data
```python
# tests/fixtures/generators.py
def generate_firewall_log(overrides: dict = None) -> str:
    template = "2026-03-22 {time} FW {action} {protocol} {src_ip}:{src_port} -> {dst_ip}:{dst_port}"
    return template.format(**overrides)
```
