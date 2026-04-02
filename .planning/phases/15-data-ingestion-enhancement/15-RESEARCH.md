# Phase 15: 数据接入用户体验增强 - 研究

**研究日期:** 2026-04-02
**Domain:** AI 日志格式识别、可视化字段映射、批量接入、解析测试
**Confidence:** MEDIUM

## Summary

Phase 15 需要在现有 4 步向导 (DI-01~DI-06) 基础上增加 4 个高级功能：

1. **DI-07 AI 自动识别**: 用户提供 3-5 条示例日志，LLM 自动识别格式并推荐字段映射
2. **可视化字段映射**: 拖拽式界面，实时预览解析效果
3. **DI-08 批量接入**: CSV/Excel 批量导入设备列表，统一应用模板
4. **DI-09 解析测试**: 用历史日志测试解析准确率，达标后开启实时接入

**现有架构已就绪:**
- 前端: React 18 + TanStack Query + Zustand + WizardModal
- 后端: FastAPI + Pydantic 模型
- Parser: 三层解析 (Template → Drain → LLM)，Tier-3 LLM 是存根
- LLM: 已支持 vLLM/DeepSeek/MiniMax 配置
- xlsx 库已存在于 frontend/package.json

**主要缺口:**
- DSPy Tier-3 实现 (签名和程序)
- 拖拽式 UI 组件库
- 批量导入 API 和前端
- 解析测试准确率计算

---

## User Constraints (from CONTEXT.md)

> Phase 15 未找到 CONTEXT.md，本阶段无锁定决策，全部为 Claude's Discretion。

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DI-07 | AI 自动识别日志格式并推荐字段映射 | DSPy Signature 设计和 LLM 集成方案 |
| DI-08 | 批量导入设备列表，统一应用模板 | CSV/Excel 解析方案 + 批量 API 设计 |
| DI-09 | 解析测试准确率计算 | 准确率指标定义和测试管道设计 |

---

## Standard Stack

### Core (Frontend)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 18.2.0 | UI 框架 | 现有 |
| TypeScript | 5.x | 类型安全 | 现有 |
| TanStack Query | 5.95.2 | 数据获取 | 现有 |
| Zustand | 4.5.7 | 状态管理 | 现有 |
| xlsx | 0.18.5 | CSV/Excel 解析 | **已存在，无需安装** |
| @dnd-kit/core + @dnd-kit/sortable | 最新 | 拖拽式字段映射 | **需安装** |

### Core (Backend)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| FastAPI | 0.135.2 | API 框架 | 现有 |
| Pydantic | 2.12.5 | 数据验证 | 现有 |
| DSPy | 2.0+ (可选) | LLM Signature | **需安装 (ai extras)** |
| drain3 | 0.9.11 | 日志聚类 | 现有 |

### 安装命令
```bash
# 后端 DSPy
source .venv/bin/activate
pip install "dspy>=2.0.0"

# 前端拖拽库
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── components/ingestion/
│   ├── wizard/
│   │   ├── Step3LogFormat.tsx        # 扩展：AI 识别和字段映射
│   │   ├── Step5BatchImport.tsx      # 新增：批量导入步骤
│   │   ├── Step6ParseTest.tsx       # 新增：解析测试步骤
│   │   └── FieldMapping/            # 新增：拖拽式字段映射组件
│   │       ├── FieldMapper.tsx      # 拖拽映射主组件
│   │       ├── DraggableField.tsx   # 可拖拽字段
│   │       └── MappingPreview.tsx   # 实时预览
│   └── api/ingestionEndpoints.ts   # 扩展 API hooks

src/api/
├── ingestion_endpoints.py           # 扩展新端点
├── ingestion_models.py              # 扩展 Pydantic 模型
├── parse_test_models.py             # 新增：解析测试模型

parser/
├── dspy/
│   ├── signatures/__init__.py       # 重写：真实 DSPy Signature
│   └── programs/log_parser.py       # 重写：真实 DSPy Program
```

### Pattern 1: DSPy Signature for Log Format Recognition

**What:** 使用 DSPy Signature 定义 LLM 输入输出规范

**When to use:** AI 自动识别日志格式时

**Example:**
```python
# parser/dspy/signatures/__init__.py
from dspy import InputField, OutputField, Signature

class LogFormatRecognition(Signature):
    """识别日志格式并推荐字段映射"""
    raw_logs = InputField(desc="3-5条原始日志示例，每条一行")
    source_type = InputField(desc="数据源类型描述，如 firewall、suricata")

    detected_format = OutputField(desc="检测到的格式：CEF/Syslog/JSON/Custom")
    regex_pattern = OutputField(desc="Python 正则表达式，包含命名捕获组")
    field_mappings = OutputField(desc="字段映射 JSON，如 {\"timestamp\": \"时间戳\", \"src_ip\": \"源IP\"}")
    confidence = OutputField(desc="置信度 0.0-1.0")
    reasoning = OutputField(desc="识别理由和解析思路")
```

### Pattern 2: Drag-and-Drop Field Mapping

**What:** 使用 @dnd-kit 实现字段拖拽映射

**When to use:** 可视化字段映射界面

**Example:**
```typescript
// FieldMapper.tsx 结构
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggableSourceField({ field }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.name,
    data: { type: 'source', field }
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div {...attributes} {...listeners}>{field.name}</div>
    </div>
  );
}

function FieldMapper({ sourceFields, targetFields, onMappingChange }) {
  const handleDragEnd = (event: DragEndEvent) => {
    // 映射逻辑
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={sourceFields.map(f => f.name)}>
        {sourceFields.map(f => <DraggableSourceField field={f} />)}
      </SortableContext>
      {/* 目标区域 */}
    </DndContext>
  );
}
```

### Pattern 3: Batch Import with xlsx

**What:** 解析 CSV/Excel 批量导入设备列表

**When to use:** 批量接入时

**Example:**
```typescript
import * as XLSX from 'xlsx';

interface BatchDevice {
  name: string;
  device_type: string;
  host: string;
  port: number;
  protocol: string;
  log_format: string;
}

async function parseBatchFile(file: File): Promise<BatchDevice[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: BatchDevice[] = XLSX.utils.sheet_to_json(sheet);

  // 验证和转换
  return rows.map(row => ({
    name: row['设备名称'] || row['name'],
    device_type: row['设备类型'] || row['device_type'],
    host: row['主机'] || row['host'],
    port: parseInt(row['端口'] || row['port']) || 514,
    protocol: row['协议'] || row['protocol'] || 'ssh',
    log_format: row['日志格式'] || row['log_format'] || 'Auto',
  }));
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV/Excel 解析 | 手写解析器 | xlsx 库 | 已集成，功能完善，处理边界情况 |
| 拖拽功能 | 原生 HTML5 DnD | @dnd-kit | React 生态最佳，无障碍支持 |
| LLM 调用抽象 | 直接调用 API | DSPy Signature | 类型安全、可组合、签名驱动 |
| 正则生成 | ChatGPT prompt | 结构化 DSPy OutputField | 可验证、置信度量化 |

---

## Common Pitfalls

### Pitfall 1: LLM 生成的正则不可用
**What goes wrong:** LLM 生成的 regex 语法正确但无法匹配实际日志
**Why it happens:** 缺少 few-shot examples，prompt 不够精确
**How to avoid:** 提供 3-5 条实际日志作为输入，让 LLM 推理而非生成
**Warning signs:** confidence < 0.7 时 flag 为"需人工确认"

### Pitfall 2: 大文件批量导入导致前端卡顿
**What goes wrong:** 解析 1000+ 行 Excel 时 UI 冻结
**Why it happens:** xlsx 解析在主线程执行
**How to avoid:** 使用 Web Worker 或分片处理
**Warning signs:** 文件 > 1MB 时需注意

### Pitfall 3: 解析准确率计算的误导性
**What goes wrong:** 100% 准确率但实际解析失败
**Why it happens:** 字段名匹配≠值正确解析
**How to avoid:** 同时计算字段级和值级准确率

---

## Code Examples

### Backend: Parse Test Request Model

```python
# src/api/parse_test_models.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ParseTestRequest(BaseModel):
    """解析测试请求"""
    template_id: str = Field(..., description="模板 ID")
    test_logs: List[str] = Field(..., min_length=1, max_length=1000,
                                  description="测试日志列表")
    ground_truth: Optional[List[Dict]] = Field(None,
                                                 description=" ground truth 标注")

class FieldAccuracy(BaseModel):
    """字段级别准确率"""
    field_name: str
    correct: int
    total: int
    accuracy: float

class ParseTestResult(BaseModel):
    """解析测试结果"""
    total_logs: int
    success_count: int
    failure_count: int
    overall_accuracy: float
    field_accuracies: List[FieldAccuracy]
    failed_samples: List[Dict] = Field(default_factory=list,
                                        description="失败样例")
    is_qualified: bool = Field(...,
                                description="是否达标 (准确率 >= 阈值)")
```

### Backend: AI Recognition Endpoint

```python
# src/api/ingestion_endpoints.py 新增

from src.analysis.llm_config import get_lm
from parser.dspy.signatures import LogFormatRecognition

@router.post("/recognize-format")
async def recognize_log_format(
    logs: List[str] = Body(..., description="3-5条示例日志")
) -> Dict:
    """DI-07: AI 自动识别日志格式"""
    lm = get_lm()
    if not lm:
        raise HTTPException(503, "LLM service unavailable")

    # 使用 DSPy 签名调用
    with dspy.context(lm=lm):
        predictor = dspy.Predict(LogFormatRecognition)
        result = predictor(
            raw_logs="\n".join(logs),
            source_type="unknown"
        )

    return {
        "detected_format": result.detected_format,
        "regex_pattern": result.regex_pattern,
        "field_mappings": json.loads(result.field_mappings),
        "confidence": result.confidence,
        "reasoning": result.reasoning
    }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 手动配置正则 | LLM 自动识别 | Phase 15 | 降低配置门槛 |
| 单条接入 | 批量 CSV 导入 | Phase 15 | 提高效率 10x+ |
| 盲目开启接入 | 解析测试通过后开启 | Phase 15 | 减少错误配置 |

---

## Open Questions

1. **LLM 识别准确率阈值设定**
   - What we know: confidence 0.0-1.0 可从 DSPy 获取
   - What's unclear: 实际业务需要的最低阈值 (建议 0.8?)
   - Recommendation: 配置项 `PARSE_MIN_CONFIDENCE=0.8`

2. **批量导入的模板应用策略**
   - What we know: 用户可上传设备列表
   - What's unclear: 统一应用同一模板还是每行指定模板
   - Recommendation: 支持两种模式，默认统一应用

3. **解析测试的 ground truth 来源**
   - What we know: 需要测试日志和预期结果对比
   - What's unclear: 用户如何提供 ground truth
   - Recommendation: 第一阶段使用"无 ground truth"模式，只验证解析成功率

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 前端构建 | ✓ | 22.22.0 | — |
| npm | 包管理 | ✓ | 10.9.4 | — |
| Python 3.10 | 后端 | ✓ | 3.10.12 | — |
| DSPy | Tier-3 LLM | ✗ | — | 存根模式（有限功能） |
| @dnd-kit | 拖拽 UI | ✗ | — | 安装 @dnd-kit/core |

**Missing dependencies with no fallback:**
- DSPy: Tier-3 LLM 功能将受限，但不会阻塞 UI 和批量接入功能

**Missing dependencies with fallback:**
- @dnd-kit: 可先使用 HTML5 原生 DnD 实现简单版，后续升级

---

## Integration Points

### Frontend → Backend

| 功能 | 新增 API | Method |
|------|----------|--------|
| AI 识别格式 | `/api/ingestion/recognize-format` | POST |
| 解析测试 | `/api/ingestion/test-parse` | POST |
| 批量创建 | `/api/ingestion/templates/batch` | POST |
| 预览解析 | `/api/ingestion/preview-parse` | POST |

### Backend → Parser

```python
# 新增端点使用 ThreeTierParser
from parser.pipeline import ThreeTierParser

parser = ThreeTierParser()

def preview_parse(logs: List[str], template_id: str) -> List[dict]:
    """预览解析结果"""
    # 加载模板
    template = _templates.get(template_id)
    results = []
    for log in logs:
        result = parser.parse(log, template.get("source_type", "unknown"))
        results.append(result)
    return results
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + React Testing Library |
| Config file | pytest.ini (已存在) |
| Quick run command | `pytest tests/test_parse*.py -x` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DI-07 | LLM 识别格式并返回正则 | unit | `pytest tests/test_llm_recognition.py -x` | ❌ Wave 0 |
| DI-07 | 字段映射 UI 拖拽功能 | unit | `pytest frontend/ -x` | ❌ Wave 0 |
| DI-08 | CSV 批量导入解析 | unit | `pytest tests/test_batch_import.py -x` | ❌ Wave 0 |
| DI-09 | 解析准确率计算 | unit | `pytest tests/test_parse_accuracy.py -x` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/test_llm_recognition.py` — 测试 LLM 格式识别
- [ ] `tests/test_batch_import.py` — 测试批量导入
- [ ] `tests/test_parse_accuracy.py` — 测试准确率计算
- [ ] `frontend/src/components/ingestion/wizard/__tests__/` — 前端组件测试
- [ ] Framework install: `pip install "dspy>=2.0.0"` (如果需要完整功能)

*(如果无 gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Sources

### Primary (HIGH confidence)
- DSPy 官方文档 - Signature 模式设计
- @dnd-kit 官方文档 - React 拖拽实现
- xlsx npm 包文档 - Excel 解析

### Secondary (MEDIUM confidence)
- 现有代码库分析 - 架构集成点

### Tertiary (LOW confidence)
- 最佳实践搜索 (WebSearch API 不可用，基于经验)

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - xlsx 已确认存在，其他需安装
- Architecture: HIGH - 现有架构清晰，扩展点明确
- Pitfalls: MEDIUM - 基于常见问题模式

**研究日期:** 2026-04-02
**Valid until:** 2026-05-02 (30 days)
