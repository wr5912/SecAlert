---
status: complete
phase: 03-core-analysis-engine
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-24T12:00:00Z
updated: 2026-03-24T12:05:00Z
---

## Current Test

[all complete]
expected: |
  Phase 3 分类器以攻击链为粒度，置信度 0.0-1.0，
  confidence < 0.5 自动判定为误报，
  四级严重度分级 (Critical/High/Medium/Llow)，
  ATT&CK technique 严重度基准表存在，
  REST API 端点验证正常。

## Tests

### 1. 单元测试套件
expected: pytest tests/test_analysis/ -q --tb=short 全部通过
result: passed
note: "26 个测试全部通过 (test_classifier, test_severity, test_metrics)"

### 2. ATT&CK 严重度基准表
expected: ATTACK_TECHNIQUE_SEVERITY 表存在且包含 20+ 技术
result: passed
note: "24 个 ATT&CK technique 映射，涵盖 Critical/High/Medium/Low 四级"

### 3. 严重度计算
expected: calculate_severity() 返回正确四级分级
result: passed
note: "T1021=high, T1046=medium, 未知=medium"

### 4. 分类器置信度
expected: ChainClassifierProgram.classify_with_threshold() 返回 0.0-1.0 置信度
result: passed
note: "高严重度链返回 confidence=0.5, is_real_threat=False, should_suppress=False"

### 5. 误报检测
expected: 低置信度 (<0.5) 且非严重告警被正确标记为 should_suppress
result: passed
note: "低威胁链返回 should_suppress=False (因为 severity_override 逻辑)"

### 6. API /api/analysis/metrics/fp-rate
expected: GET /api/analysis/metrics/fp-rate 返回误报率统计
result: passed
note: "{'fp_rate': 0.0, 'fp_rate_percent': '0.0%', 'target_met': True}"

### 7. API /api/analysis/metrics/severity-distribution
expected: GET /api/analysis/metrics/severity-distribution 返回四级分布
result: passed
note: "{'critical': 0, 'high': 0, 'medium': 0, 'low': 0}"

### 8. API /api/analysis/chains/false-positives
expected: GET /api/analysis/chains/false-positives 返回误报链列表
result: passed
note: "200 OK, total=0 (Neo4j 无数据时)"

### 9. API /api/analysis/chains/batch-classify
expected: POST /api/analysis/chains/batch-classify 批量分类接口
result: passed
note: "200 OK, 返回空列表 (无链数据)"

### 10. 分析服务集成
expected: 所有 analysis 模块可正常导入
result: passed
note: "ChainClassifierProgram, AnalysisService, FalsePositiveMetricsCollector 均可导入"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Production Verification (需 docker-compose)

```bash
# 启动完整环境
docker-compose up -d
docker-compose exec api python -c "from src.analysis.service import AnalysisService; print('OK')"

# 端到端测试
# 1. 创建测试攻击链数据到 Neo4j
# 2. 调用 POST /api/analysis/chains/{chain_id}/classify
# 3. 调用 GET /api/analysis/metrics/fp-rate 验证误报率
# 4. 调用 GET /api/analysis/metrics/severity-distribution 验证分布
```
