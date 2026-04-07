# 构建AI友好的项目文档WIKI调研

> 参考： Andrej Karpathy在2026年4月3日发表的X博文：https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

Andrej Karpathy 在 2026 年初提出的 **“LLM Wiki”**（基于 LLM 的个人知识库）模式，其核心洞察在于：**放弃传统的“每次提问时进行动态 RAG（检索增强生成）”，转而让 LLM 充当“编译器”，将零散的原始资料（Raw Sources）增量编译、提炼为一个结构化、相互链接的持久化 Markdown Wiki，并且由一个全局索引（Index）驱动 AI 的阅读与开发。**

将人类友好的 `AAA/initiative_docs`（包含会议记录、脑暴、调研报告、冗长的飞书/Slack讨论）转换为 AI 友好的 `AAA/docs` 目录，完美契合了这一理念。

以下是将项目文档目录整理成 AI 友好目录的**指导思想**、**Meta知识**和**最佳实践**：

---

### 一、 指导思想（Guiding Principles）

#### 1. 预编译替代实时检索（Compilation over RAG）
人类文档往往是按**时间线**或**事件**组织的（如“4月1日产品评审会议记录.docx”），存在大量上下文缺失、冗余和废话。AI 不需要每次写代码时都去海量文本中“大海捞针”。
*   **转变**：`AAA/docs` 必须是**预先编译好的“知识结果”**，而不是“历史记录的堆砌”。它应当像代码一样被构建，每次 `initiative_docs` 有新增，就让 AI Agent 去阅读它，并将提取的关键信息**合并（Merge）**到 `AAA/docs` 中已有的结构化页面里。

#### 2. 以“实体与架构”为中心，打破文档边界（Entity-Centric）
人类按“文档”思考，AI 按“逻辑实体”思考。
*   **转变**：LLM 会将 `initiative_docs` 中分散在调研报告、UI设计、会议结论里的关于“用户鉴权”的信息打碎，然后在 `AAA/docs` 中统一汇总到一个 `auth_module.md` 中。交叉引用（Cross-references）已经在文档生成时由 LLM 建立完毕。

#### 3. 显式化共识，标记冲突（Synthesis & Conflict Resolution）
人类的讨论中往往充满矛盾（如 PM 要求 A，但技术 Leader 后来改为 B）。
*   **转变**：AI 友好的文档不能包含模棱两可的内容。LLM 在提取信息时，如果发现矛盾，必须在编译出的 `docs` 中显式地解决它（基于最新时间戳），或者使用显式的 `[WARNING: 冲突未决]` 标签让开发者确认，避免在编码时产生幻觉。

#### 4. LLM 维护，人类只负责投喂（Agent-Maintained）
*   **转变**：开发者不需要手动去写 `AAA/docs`。你的工作是将人类资料丢进 `AAA/initiative_docs`，然后通过 Prompt 让编码 Agent（如 Claude Code、Cursor、OpenDevin 等）自动阅读并更新 `AAA/docs` 目录。

---

### 二、 AI友好目录的架构与组织

为了让 AI 在开发项目 AAA 时最高效地获取上下文，`AAA/docs` 目录的结构和元数据应该包含以下几个核心模块：

#### 1. 全局索引地图（The Master Index）—— 核心中的核心
Karpathy 强调，AI 应当**先读索引，再钻取细节（Read index first, then drill down）**。
*   **文件**：`AAA/docs/index.md`
*   **内容**：这是所有 Wiki 的目录。包含项目所有模块、实体的分类列表，每一个 Markdown 文件都配有一句话（One-line summary）说明。
*   **作用**：编码 Agent 在接手任何任务前，只需读取 `index.md`，就能精准知道应该去读取哪个具体的 `xxx.md` 获取上下文，极大节省 Token 和降低幻觉。

#### 2. 实体/模块规范（Entity & Component Pages）
*   **文件**：如 `database_schema.md`, `api_endpoints.md`, `payment_gateway.md`
*   **内容**：高信息密度的具体规范。剥离了人类情感和推导过程，只保留：输入输出要求、数据类型、业务硬性规则（Business Logic constraints）。

#### 3. 架构与决策记录（Architecture & ADRs）
*   **文件**：如 `architecture.md`, `decisions_log.md`
*   **内容**：AI 经常会根据它的训练数据“自作主张”推荐其他技术栈。你必须在这里明确写明技术选型及其**约束原因**（如：“我们使用 PostgreSQL 而不是 MongoDB，因为调研阶段确认需要强事务支持”），约束 AI 的代码生成方向。

#### 4. 术语表（Glossary）
*   **文件**：`glossary.md`
*   **内容**：人类在讨论时可能把“客户”、“用户”、“租户”混着用，但这在数据库和代码中是致命的。术语表将业务黑话映射到确定的代码变量名（如：`Customer` -> 统一使用 `Tenant` 实体）。

---

### 三、 最佳实践（Best Practices）

在实际操作中，将 `initiative_docs` 转换为 `docs`，你需要遵守以下工作流和排版技巧：

#### 1. 高信息密度的 Markdown 格式排版
AI 解析 Markdown 是最高效的。在生成的 `docs/*.md` 中：
*   **多用列表，少用长段落**：使用项目符号（Bulleted lists）呈现逻辑分支。
*   **YAML Frontmatter**：在每个文件的顶部加上元数据，方便 AI 判断信息的时效性。
    ```markdown
    ---
    status: approved
    last_updated: 2026-04-07
    source_refs:["initiative_docs/PRD_v1.pdf", "initiative_docs/0401_meeting.txt"]
    ---
    ```
*   **显式的 Markdown 内部链接**：例如在 `api_endpoints.md` 中提及用户表时，写作 `请参考 [[database_schema.md]] 中的 User 表`。当前多数高级 Agent 能识别这种链接并自动拉取关联文档。

#### 2. 建立“初始化提炼”与“增量更新”的 Agent Prompt
不要自己写 `AAA/docs`。把以下两套 Prompt 存成工具，让大模型帮你做：

*   **初始化 Prompt（Init）**：
    > “读取 `AAA/initiative_docs` 中的所有材料。你的任务是将其编译为一个结构化的技术 Wiki `AAA/docs`。请提取业务核心逻辑、技术约束、模块设计，并生成一个分类清晰的 `index.md`，以及多个按实体划分的子 Markdown 文件。消除所有冗长的人类讨论背景，只保留结论和工程规范。”
*   **增量更新 Prompt（Update）**：
    > “我刚在 `AAA/initiative_docs` 添加了 `0407_auth_redesign.md`。请先阅读 `AAA/docs/index.md`，评估这个新文件影响了哪些现有的设计。请修改对应的 `docs/xxx.md` 页面以反映最新设计，并更新索引，保留原先不冲突的逻辑。不要只是追加文本，请重构融合（Synthesize）它。”

#### 3. 提供“反向溯源”机制（Traceability）
虽然 AI 主要依靠 `docs` 进行编码，但偶尔在处理极端复杂的业务边界条件时，编译后的信息可能丢失细节。
在 `docs` 的具体规则后，保留类似 `[溯源: 见 initiative_docs/调研文档2.docx 的第3节]` 的引用。当 Agent 对某条规则产生困惑时，它可以通过溯源路径回到原始人类语境中寻找解释。

#### 4. 显式设定“What NOT to do”（防坑指南）
在调研和脑暴阶段，往往会产生很多“走不通的路”和“被否决的方案”。在编译到 `docs/` 时，务必建立一个 `anti_patterns.md` 或在对应模块下加入 `### 明确否决的设计` 章节。
告诉 AI：“不要使用 Redis 做持久化，因为调研报告指出我们的数据敏感度极高” —— **告诉 AI 不要怎么做，通常比告诉它怎么做更能提高代码的 First-pass success rate（一次性通过率）。**