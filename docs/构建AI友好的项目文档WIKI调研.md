# 构建AI友好的项目文档WIKI调研

> 参考： Andrej Karpathy在2026年4月3日发表的X博文：https://x.com/karpathy/status/2039805659525644595

将项目前期的“人类讨论与探索资料”转化为“AI友好的开发蓝图”，这正是 Karpathy 理念在软件工程中的完美应用场景。

人类友好的文档（如会议记录、脑图、Slack聊天导出、多版本的产品草案）通常是**按时间线（Chronological）或意识流**组织的，充满了冗余、逻辑反转（“昨天决定用A，今天开会决定改用B”）和背景噪音。如果直接让 AI 读这些材料去写代码，AI 会彻底精神分裂（即上下文混乱和严重幻觉）。

而 AI 友好的文档需要是**状态化（Stateful）、原子化（Atomic）、关系化（Relational）且消除歧义的**。

以下是基于 Karpathy 的理念，将 `AAA/initiative_docs` 转化为可直接指导 AI 编码的 `AAA/docs` 的详细最佳实践方案：

---

### 第一步：明确目录层级的“物理隔离”（状态隔离）

首先，在项目 AAA 的根目录下，严格区分文档的生命周期状态。绝不要在原有的讨论文档上直接修改。

```text
AAA/
├── .cursorrules (或 CLAUDE.md)  <-- AI 的“系统宪法”
├── initiative_docs/             <-- 对应 Karpathy 的 raw/（不可变层）
│   ├── 0301_需求评审会议记录.md
│   ├── 竞品分析与调研报告.pdf
│   └── 数据库选型讨论(Slack记录).txt
├── docs/                        <-- 对应 Karpathy 的 wiki/（AI编译层，代码蓝图）
│   ├── _master_index.md         <-- 超级索引
│   ├── architecture/            <-- 架构设计
│   ├── data_models/             <-- 数据模型
│   ├── api_specs/               <-- API定义
│   └── features/                <-- 具体功能拆解
└── src/                         <-- output/（最终的代码交付层）
```

**💡 核心原则：** `initiative_docs` 是**“只读（Read-only）”**的，作为事实溯源库；`docs` 是由 AI 提炼后生成的，是开发阶段的**“唯一事实来源（Single Source of Truth, SSOT）”**。

---

### 第二步：配置 AI 的“架构师系统提示词” (`CLAUDE.md` / `.cursorrules`)

在转换开始前，你需要给你的本地 AI 智能体（如 Claude Code, Cursor, Cline）写下规则。这决定了 `docs/` 的生成质量。

在根目录创建一个 `.cursorrules` 或 `CLAUDE.md`，写入以下核心指令：

```markdown
# Role: 高级系统架构师与技术文档工程师

## 任务：
你负责读取 `initiative_docs/` 中的原始讨论，并将其综合、提炼、转化为 `docs/` 目录下符合规范的、对AI友好的技术蓝图。

## 规则 (AI-Friendly 文档规范)：
1. **消除歧义与冲突**：在原始讨论中寻找“最终决策”。如果不同会议记录中存在冲突，以时间最新的为准，或者向人类提问确认。不要在 docs 中保留“讨论过程”，只写“最终决定”。
2. **原子化 (Atomic)**：一个文件只描述一个核心事物（一个API、一张表、一个独立模块）。
3. **双向链接**：使用 `[[filename]]` 格式连接关联的模块、数据模型和API。
4. **强制结构**：每个 `docs/` 下的 Markdown 文件必须包含：
   - YAML Frontmatter (描述模块状态、依赖)
   - `> AI Summary` (一句话总结该模块职责)
   - `Source Traceability` (标明该决定来自 `initiative_docs` 中的哪个文件，方便查证)
5. **维护索引**：每次在 `docs/` 添加新文件，必须同步更新 `docs/_master_index.md`。
```

---

### 第三步：设计 `AAA/docs` 的内部网状结构（AI友好结构）

在 `docs` 目录中，你需要建立一套让大模型在写代码时能**“按需精准读取”**的结构。不要写那种长达 50 页的《系统详细设计说明书.docx》，AI 的上下文窗口吃不消，且容易分心。

#### 1. 唯一入口：`_master_index.md`
这是 AI 开发时的“地图”。每次你让 AI 写功能，AI 应该先看这个文件。
```markdown
# AAA 项目开发导航图

## 1. 架构概览
- 系统核心架构图解：[[architecture/system_overview]]
- 技术栈与选型：[[architecture/tech_stack]]

## 2. 数据层 (Database)
- 用户表字典：[[data_models/User_Table]]
- 订单表字典：[[data_models/Order_Table]]

## 3. 核心功能点 (Features)
- 用户鉴权模块：[[features/auth_module]]
- 支付结算模块：[[features/payment_flow]]
```

#### 2. 原子化标准模板示例：`features/auth_module.md`
AI 提炼出来的具体说明文档应该长这样：

```markdown
---
module: Auth
status: Ready for Dev
dependencies: [[[data_models/User_Table]], [[api_specs/login_api]]]
---

# 用户鉴权模块

> **AI Summary:** 采用 JWT 方案，基于邮箱和验证码的无密码登录机制。

## 1. 核心逻辑 (Business Rules)
1. 用户输入邮箱获取验证码。
2. 验证码有效期为 5 分钟，Redis 缓存处理。
3. 登录成功返回 JWT Token (有效时间24h) 和 Refresh Token (有效时间7天)。

## 2. 依赖交互
- 前端调用 [[api_specs/send_code_api]] 和 [[api_specs/login_api]]。
- 成功后写入/更新数据库 [[data_models/User_Table]]。

## 3. 溯源区 (Traceability)
- 决策来源：[[initiative_docs/0301_需求评审会议记录.md]] (确定了放弃密码登录，采用验证码方案)。
```

---

### 第四步：实操工作流（让 AI 自动完成转化）

现在，结构设计好了，你可以在终端或 Cursor 中唤起 AI 智能体，分步骤执行“编译”：

**指令 1：全局梳理与冲突解决**
> "阅读 `initiative_docs/` 下的所有文件。提取出本项目的所有核心业务实体、最终选定的技术栈、以及确定的功能列表。注意甄别讨论中的反转，整理出一份不受背景噪音干扰的“核心结论清单”给我审核。"

**指令 2：建立底层模型与API**
> "根据上一步的清单，在 `docs/data_models/` 目录下为每个数据库实体创建单独的 `.md` 文件。明确字段类型。接着在 `docs/api_specs/` 中创建对应的 API 契约文档。记得在文件之间使用 `[[ ]]` 进行交叉引用。"

**指令 3：生成功能模块说明**
> "在 `docs/features/` 目录下，将业务逻辑拆解为独立的模块文档。将它们与前一步创建的 data_models 和 api_specs 建立关联。必须在每个文件底部标注来源于 `initiative_docs/` 的哪个源文件。"

**指令 4：构建总索引**
> "最后，生成 `docs/_master_index.md`，将所有刚才创建的文件结构化地汇总在这里。"

---

### 第五步：进入开发阶段（如何利用这个 AI 友好的结构）

到了真正写代码 (`src/`) 的阶段，这套系统的威力就会显现。

过去的糟糕做法：
> "帮我写一下登录功能的代码。需求参考 `initiative_docs/需求文档.docx`。" *(结果：AI 把几十页的废话读了一遍，漏掉了某个 Slack 里的补充设定，写出错误的代码)*

**现在的正确做法（Karpathy 式的精准打击）：**
> "@_master_index.md 请帮我实现用户鉴权模块的代码。"

**AI 的思考路径（隐式规划）：**
1. 读取 `_master_index.md`。
2. 发现用户鉴权对应 `[[features/auth_module]]`，读取该文件。
3. 在 `auth_module.md` 中，发现它依赖 `[[data_models/User_Table]]` 和 `[[api_specs/login_api]]`。
4. AI **按需加载** 这三个小文件进入上下文（总共不到 2000 tokens，全是干货）。
5. AI 写出完全符合最终设计的、100% 正确的代码。

### 总结

将“人类讨论文档”转为“AI开发文档”，本质上是**让 LLM 充当“编译器”，将非结构化的自然语言（需求）编译成“结构化的伪代码/元数据（文档）”，然后再把“文档”编译成“真正的代码”。** 

通过切断 `initiative_docs` 与 `src` 的直接联系，引入 `docs` 作为中间隔离缓冲层，不仅大幅降低了 AI 写代码时的 Token 消耗和幻觉率，还能留下一份对未来维护极其友好的架构沉淀。