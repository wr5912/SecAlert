# Phase 14: 数据接入前端界面 - Research

**Researched:** 2026-04-01
**Domain:** React/FastAPI CRUD UI, Multi-step Wizard Pattern, Form Validation
**Confidence:** HIGH

## Summary

Phase 14 为 SecAlert 构建数据接入配置 UI，为非专业运维人员提供直观的数据源配置界面。核心是 4 步骤模态对话框向导 + 独立模板管理页面。

**Primary recommendation:** 基于已有 shadcn base-nova 组件库和 Tactical Command Center 设计系统，使用 react-hook-form + zod 实现表单验证，采用 zustand 管理向导状态，FastAPI 提供 CRUD API。

---

## User Constraints (from CONTEXT.md)

### Phase Goals
- 数据源配置 UI（设备类型、连接参数、日志格式）
- 接入状态监控和诊断
- 模板管理界面
- 接入向导和引导流程

### Out of Scope
- 自动响应/自动阻断
- 专业安全分析师工具
- 实时阻断防护

### Design Constraints
- 分步骤模态对话框向导 (Step 1-4)
- 独立模板管理页面
- 已有 Tactical Command Center 设计系统

---

## Standard Stack

### Frontend
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| React | 18.2.0 | UI 框架 | package.json |
| TypeScript | 5.0.0 | 类型系统 | package.json |
| Vite | 5.0.0 | 构建工具 | package.json |
| shadcn/ui (base-nova) | 4.1.0 | 组件库 | package.json |
| @base-ui/react | 1.3.0 | Dialog 底层 | package.json |
| @tanstack/react-query | 5.95.2 | 数据获取/缓存 | package.json |
| react-hook-form | 7.72.0 | 表单状态管理 | package.json |
| @hookform/resolvers | 3.10.0 | 表单验证集成 | package.json |
| zod | 3.25.76 | Schema 验证 | package.json |
| zustand | 4.5.7 | 轻量状态管理 | package.json |
| sonner | 1.7.4 | Toast 通知 | package.json |
| lucide-react | 0.263.1 | 图标库 | package.json |
| class-variance-authority | 0.7.1 | 组件变体 | package.json |

**Verification:** 所有版本来自 package.json (2026-04-01)，非训练数据。

### Backend
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| FastAPI | latest | API 框架 | 现有项目 |
| Pydantic | latest | 数据验证 | 现有项目 |
| uvicorn | latest | ASGI 服务器 | 现有项目 |

### Installation
前端无新依赖需安装（shadcn 已初始化）。

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── components/
│   └── ingestion/                    # 新增：数据接入组件
│       ├── wizard/
│       │   ├── WizardModal.tsx      # 4步骤模态框容器
│       │   ├── StepIndicator.tsx    # 步骤指示器
│       │   ├── Step1DeviceType.tsx   # Step 1: 选择设备类型
│       │   ├── Step2Connection.tsx   # Step 2: 配置连接参数
│       │   ├── Step3LogFormat.tsx    # Step 3: 选择日志格式
│       │   └── Step4Complete.tsx     # Step 4: 完成
│       ├── DeviceTypeCard.tsx       # 设备类型卡片
│       ├── ConnectionForm.tsx       # 连接参数表单
│       ├── LogFormatSelector.tsx     # 日志格式选择器
│       ├── LogPreview.tsx           # 日志预览
│       ├── TemplateCard.tsx         # 模板列表卡片
│       └── TemplateEmptyState.tsx   # 空状态
├── pages/
│   └── IngestionPage.tsx            # 新增：数据接入页面
├── api/
│   └── ingestionEndpoints.ts        # 新增：数据接入 API 客户端
├── stores/
│   └── ingestionStore.ts            # 新增：向导状态管理
└── types/
    └── ingestion.ts                 # 新增：数据接入类型定义

src/api/
├── ingestion_endpoints.py           # 新增：数据接入 API 路由
└── ingestion_models.py              # 新增：Pydantic 模型
```

### Pattern 1: Multi-Step Wizard with Zustand

**What:** 使用 zustand 管理 4 步骤向导状态，每个步骤组件独立

**When to use:** 向导流程、多页面表单

**Example:**
```typescript
// stores/ingestionStore.ts
import { create } from 'zustand';

interface WizardState {
  step: number;
  deviceType: string | null;
  connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    protocol: string;
  };
  logFormat: string | null;
  customRegex: string | null;
  setStep: (step: number) => void;
  setDeviceType: (type: string) => void;
  setConnection: (conn: Partial<WizardState['connection']>) => void;
  setLogFormat: (format: string, regex?: string) => void;
  reset: () => void;
}

// Source: 项目 patterns (参考 chatStore.ts)
```

### Pattern 2: React Hook Form + Zod Validation

**What:** 使用 react-hook-form 管理表单状态，zod 做 schema 验证

**When to use:** 表单输入验证

**Example:**
```typescript
// Step2Connection.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const connectionSchema = z.object({
  host: z.string().min(1, '请输入主机地址'),
  port: z.number().min(1).max(65535),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  protocol: z.enum(['ssh', 'snmp', 'http', 'jdbc']),
});

type ConnectionForm = z.infer<typeof connectionSchema>;

// Source: 项目 patterns (SettingsPage 使用 react-hook-form)
```

### Pattern 3: FastAPI Router Pattern

**What:** 标准 FastAPI router 注册模式

**When to use:** 新 API 端点

**Example:**
```python
# src/api/ingestion_endpoints.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

class DataSourceTemplate(BaseModel):
    id: Optional[str] = None
    name: str
    device_type: str
    connection: dict
    log_format: str
    custom_regex: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    device_type: str
    connection: dict
    log_format: str
    custom_regex: Optional[str] = None

@router.get("/templates")
async def list_templates() -> List[DataSourceTemplate]:
    ...

@router.post("/templates")
async def create_template(template: TemplateCreate) -> DataSourceTemplate:
    ...

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str) -> dict:
    ...

# Source: src/api/chain_endpoints.py (现有模式)
```

### Pattern 4: TanStack Query Data Fetching

**What:** 使用 useQuery / useMutation 进行数据获取和提交

**When to use:** API 数据交互

**Example:**
```typescript
// ingestionEndpoints.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/ingestion/templates');
      return res.json();
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template) => {
      const res = await fetch('/api/ingestion/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

// Source: frontend/src/lib/api.ts (现有模式)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 表单验证 | 手写验证逻辑 | react-hook-form + zod | 减少样板代码，类型安全 |
| Dialog 实现 | 手写 dialog 组件 | shadcn Dialog | 已有 base-nova 样式 |
| 状态管理 | Redux / Context | zustand | 轻量，类型安全，zundo 支持 |
| Toast 通知 | 手写通知组件 | sonner | 已有集成 |
| API 状态 | 手写 fetch 逻辑 | TanStack Query | 缓存、重试、加载状态自动化 |

---

## Common Pitfalls

### Pitfall 1: Wizard 状态丢失
**What goes wrong:** 刷新页面或关闭 modal 后向导状态丢失，用户需重新填写。
**Why it happens:** 状态存储在内存中，未持久化。
**How to avoid:** 在 zustand store 中可选添加 sessionStorage 持久化，或在 Step 4 完成后清除状态。
**Warning signs:** 用户反馈 "填写的内容不见了"。

### Pitfall 2: Step 验证不完整
**What goes wrong:** 用户可直接点击"下一步"跳过必填字段。
**Why it happens:** 未在切换步骤前执行表单验证。
**How to avoid:** 在 `setStep` 前调用 `trigger()` 验证当前步骤。
```typescript
const onNext = async () => {
  const valid = await trigger();
  if (valid && step < 4) setStep(step + 1);
};
```
**Warning signs:** 测试时发现空值被提交。

### Pitfall 3: Dialog 动画与内容跳动
**What goes wrong:** Modal 打开时内容闪烁或跳动。
**Why it happens:** DialogContent 样式 max-w-[calc(100%-2rem)] 与内部布局冲突。
**How to avoid:** WizardModal 使用固定宽度 640px，根据 UI-SPEC。
**Warning signs:** 视觉回归测试失败。

### Pitfall 4: 移动端适配遗漏
**What goes wrong:** 向导在移动端无法正常使用。
**Why it happens:** 未测试移动端视口。
**How to avoid:** WizardModal 内部使用 `max-h-[90vh] overflow-y-auto` 确保滚动，响应式布局测试。

---

## Code Examples

### WizardModal Container (Step Indicator Pattern)

```tsx
// components/ingestion/wizard/WizardModal.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIngestionStore } from '@/stores/ingestionStore';
import { StepIndicator } from './StepIndicator';
import { Step1DeviceType } from './Step1DeviceType';
import { Step2Connection } from './Step2Connection';
import { Step3LogFormat } from './Step3LogFormat';
import { Step4Complete } from './Step4Complete';

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WizardModal({ open, onOpenChange }: WizardModalProps) {
  const { step, setStep, reset } = useIngestionStore();

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1DeviceType />;
      case 2: return <Step2Connection />;
      case 3: return <Step3LogFormat />;
      case 4: return <Step4Complete onFinish={handleClose} />;
      default: return null;
    }
  };

  const stepTitles = {
    1: '选择设备类型',
    2: '配置连接参数',
    3: '选择日志格式',
    4: '配置完成',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <StepIndicator />
          <h2 className="text-base font-medium">{stepTitles[step as keyof typeof stepTitles]}</h2>
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < 4 && (
            <Button onClick={() => setStep(step + 1)}>
              下一步
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### StepIndicator Component

```tsx
// components/ingestion/wizard/StepIndicator.tsx
import { Check } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';

const steps = [
  { num: 1, label: '设备类型' },
  { num: 2, label: '连接参数' },
  { num: 3, label: '日志格式' },
  { num: 4, label: '完成' },
];

export function StepIndicator() {
  const { step } = useIngestionStore();

  return (
    <div className="flex items-center justify-center gap-2 pb-4">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2
              ${step > s.num
                ? 'bg-accent border-accent text-background'  // 已完成
                : step === s.num
                ? 'bg-accent/20 border-accent text-accent'  // 当前
                : 'border-slate-600 text-slate-500'         // 未完成
              }`}
          >
            {step > s.num ? <Check className="w-4 h-4" /> : s.num}
          </div>
          <span className={`ml-2 text-sm ${
            step >= s.num ? 'text-accent' : 'text-slate-500'
          }`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${
              step > s.num ? 'bg-accent' : 'bg-slate-600'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### DeviceTypeCard Grid (Step 1)

```tsx
// components/ingestion/wizard/Step1DeviceType.tsx
import { Firewall, Network, Key, Server, Globe, MoreHorizontal } from 'lucide-react';
import { useIngestionStore } from '@/stores/ingestionStore';

const deviceTypes = [
  { id: 'firewall', label: '防火墙', icon: Firewall },
  { id: 'ids', label: '入侵检测系统', icon: Network },
  { id: 'vpn', label: 'VPN', icon: Key },
  { id: 'switch', label: '交换机', icon: Server },
  { id: 'router', label: '路由器', icon: Globe },
  { id: 'waf', label: 'Web应用防火墙', icon: Globe },
  { id: 'other', label: '其他设备', icon: MoreHorizontal },
];

export function Step1DeviceType() {
  const { deviceType, setDeviceType } = useIngestionStore();

  return (
    <div className="grid grid-cols-3 gap-4">
      {deviceTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = deviceType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => setDeviceType(type.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
              ${isSelected
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-slate-700 hover:border-slate-500 text-slate-400'
              }`}
          >
            <Icon className="w-10 h-10 mb-2" />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### TemplateCard Component

```tsx
// components/ingestion/TemplateCard.tsx
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string;
  name: string;
  device_type: string;
  log_format: string;
}

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-700 hover:border-accent transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
          {/* 设备类型图标 */}
        </div>
        <div>
          <h3 className="font-medium text-slate-200">{template.name}</h3>
          <p className="text-sm text-slate-500">{template.device_type}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline">{template.log_format}</Badge>
        <button
          onClick={() => onEdit(template)}
          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-accent"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix UI Dialog | @base-ui/react Dialog | Phase 12 | 更现代的 headless 组件 |
| Redux Toolkit | zustand | Phase 12 | 减少样板代码 |
| 手写表单验证 | react-hook-form + zod | Phase 12 | 类型安全、验证集中 |
| REST only | REST + WebSocket | Phase 13 | 流式响应支持 |

**Deprecated/outdated:**
- 无

---

## Open Questions

1. **数据源存储后端未定**
   - What we know: 需要 CRUD API，支持模板创建/编辑/删除/列表
   - What's unclear: 数据存储在哪个数据库 (SQLite/PostgreSQL/配置文件)?
   - Recommendation: 初期使用 JSON 配置文件存储模板，生产环境可迁移到 PostgreSQL

2. **设备类型数量是否扩展**
   - What we know: UI-SPEC 定义了 7 种设备类型
   - What's unclear: 未来是否需要用户自定义设备类型?
   - Recommendation: 当前实现 7 种固定类型，预留扩展接口

3. **连接参数验证规则**
   - What we know: 需要 IP/主机名、端口、用户名、密码/密钥
   - What's unclear: 各设备类型的端口默认值、协议选项是否不同?
   - Recommendation: Step 2 根据选择的设备类型动态调整表单字段

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 前端开发/构建 | ✓ | 18+ | — |
| npm | 包管理 | ✓ | 10+ | — |
| Python 3.10+ | 后端 API | ✓ | 3.10+ | — |
| pytest | Python 测试 | ✓ | 7+ | — |

**Missing dependencies with no fallback:**
- 无

**Missing dependencies with fallback:**
- 无

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python backend), Vitest (optional frontend) |
| Config file | tests/conftest.py (existing) |
| Quick run command | `pytest tests/test_chain/test_chain_api.py -x` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| DS-01 | 创建数据源模板 | unit | `pytest tests/test_ingestion/ -k test_create_template` | ❌ Wave 0 |
| DS-02 | 编辑数据源模板 | unit | `pytest tests/test_ingestion/ -k test_update_template` | ❌ Wave 0 |
| DS-03 | 删除数据源模板 | unit | `pytest tests/test_ingestion/ -k test_delete_template` | ❌ Wave 0 |
| DS-04 | 列表查询模板 | unit | `pytest tests/test_ingestion/ -k test_list_templates` | ❌ Wave 0 |
| DS-05 | 向导步骤切换验证 | unit | `pytest tests/test_ingestion/ -k test_wizard_step` | ❌ Wave 0 |
| DS-06 | 前端组件渲染 | unit | `pytest tests/test_ingestion/ -k test_component` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_ingestion/ -x`
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_ingestion/__init__.py` — 测试目录初始化
- [ ] `tests/test_ingestion/conftest.py` — 共享 fixtures
- [ ] `tests/test_ingestion/test_templates.py` — 模板 CRUD API 测试
- [ ] `tests/test_ingestion/test_wizard.py` — 向导状态测试
- [ ] Framework install: `pip install pytest pytest-asyncio` (如未安装)

---

## Sources

### Primary (HIGH confidence)
- 项目代码: frontend/src/ — React + TypeScript patterns
- 项目代码: src/api/ — FastAPI + Pydantic patterns
- UI-SPEC.md (已批准设计合同)

### Secondary (MEDIUM confidence)
- shadcn 官方文档 — 组件使用方式
- react-hook-form + zod 集成模式

### Tertiary (LOW confidence)
- 无

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 所有版本来自 package.json
- Architecture: HIGH - 基于项目现有模式
- Pitfalls: MEDIUM - 基于 React/FastAPI 常见问题

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, 30 days)
