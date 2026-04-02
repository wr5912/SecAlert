# SecAlert Requirements

## v1.0 MVP (Completed)

### Phase 1: Foundation & Ingestion
- REQ-01: 数据采集框架搭建
- REQ-02: Kafka消息队列集成
- REQ-03: 基础数据模型定义

### Phase 2: Attack Chain Correlation
- REQ-04: 攻击链关联分析
- REQ-05: 时序关联引擎

### Phase 3: Core Analysis Engine
- REQ-06: DSPy签名驱动AI分析
- REQ-07: 告警优先级评估

### Phase 4: Recommendations & Polish
- REQ-08: 处理建议生成
- REQ-09: 用户界面完善

---

## v1.1 多数据源支持 + 产品级 UI + AI 助手 (Completed)

### Phase 5: 多数据源支持 (DS-01 ~ DS-06)
- **DS-01**: 支持SSH Syslog数据源接入
- **DS-02**: 支持Windows Event Log数据源
- **DS-03**: 支持SNMP Trap数据源
- **DS-04**: 支持API轮询数据源（HTTP/HTTPS）
- **DS-05**: 支持数据库JDBC数据源
- **DS-06**: 数据源健康状态监控与告警

### Phase 6: 产品级 UI (UI-01 ~ UI-05)
- **UI-01**: 响应式布局框架，支持桌面/平板/手机
- **UI-02**: 告警仪表盘重构，数据可视化升级
- **UI-03**: 告警列表多维度筛选与排序
- **UI-04**: 告警详情页全新设计
- **UI-05**: 用户偏好设置与个性化配置

### Phase 7: AI 助手 (AI-01 ~ AI-05)
- **AI-01**: AI助手对话框界面
- **AI-02**: 告警上下文动态关联
- ~~**AI-03**: 自然语言查询告警~~ ✅ (07-02)
- ~~**AI-04**: AI处理建议自然语言生成~~ ✅ (07-02)
- **AI-05**: AI对话历史记录

### Phase 8: 报表 (RP-01 ~ RP-05)
- **RP-01**: 日报自动生成
- **RP-02**: 周报统计报表
- **RP-03**: 告警趋势分析图
- **RP-04**: 数据源健康报表
- **RP-05**: 报表导出功能（PDF/Excel）

---

## v1.2 智能分析工作台 (Completed)

### Phase 9: 智能分析工作台
- 攻击链路图 (React Flow + dagre)
- 告警故事线聚合
- 多轨道时间线
- 威胁狩猎工作台
- 资产上下文面板
- AI 调查助手

### Phase 10: 后端联调 + Tech Debt
- Button 组件重构
- formatDate 工具函数
- Vite alias 配置

### Phase 12: 前端视觉升级
- Tactical Command Center 设计系统
- CSS 变量、字体包
- 全组件视觉升级

---

## v1.3 Claude Code AI 后端 🚧

### Phase 13: Claude Code AI 后端 (AG-01 ~ AG-05)

- **AG-01**: claude-agent-sdk 安装与配置
  - 安装 Python SDK
  - 配置 ANTHROPIC_BASE_URL (DeepSeek 兼容)
  - 验证 SDK 连接

- **~~AG-02~~**: WebSocket 流式对话服务 ✅ (13-02)
  - 复用现有 /api/chat 接口
  - WebSocket 支持流式响应
  - 会话管理

- **~~AG-03~~**: 自定义安全工具 ✅ (13-01)
  - register_tool 注册内部 API 工具
  - 告警查询工具
  - 攻击链分析工具

- **~~AG-04~~**: DeepSeek API Key 配置 ✅ (13-02)
  - 配置 DEEPSEEK_API_KEY
  - 配置 ANTHROPIC_BASE_URL=https://api.deepseek.com
  - Fallback 机制

- **AG-05**: 集成测试与验证
  - E2E 测试
  - Fallback 降级测试
  - 性能测试

---

## v1.4 数据接入前端界面 🚧

### Phase 14: 数据接入前端界面 (DI-01 ~ DI-06)

- **DI-01**: 数据源模板创建 UI
- **DI-02**: 数据源模板编辑 UI
- **DI-03**: 数据源模板删除 UI
- **DI-04**: 数据源模板列表查询 UI
- **DI-05**: 数据接入向导（4步骤）UI
- **DI-06**: 接入状态监控和诊断 UI

### Phase 15: 数据接入用户体验增强 (DI-07 ~ DI-09)

- **DI-07**: AI 自动识别日志格式
  - 用户提供 3-5 条示例日志
  - 系统自动识别日志格式（CEF/Syslog/JSON/Custom）
  - 推荐 OCSF 统一字段映射
  - 返回置信度评分

- **DI-08**: 批量接入设备
  - CSV/Excel 批量导入设备列表
  - 统一应用模板
  - 显示导入成功/失败数量

- **DI-09**: 解析测试
  - 用历史日志测试解析准确率
  - 显示字段级和整体准确率
  - 准确率达标后开启实时接入

---

## v1.5 多源异构安全日志采集优化 🚧

### MC: 多渠道采集后端 (MC-01 ~ MC-03)

- **MC-01**: Kafka Topic 订阅采集
  - 外部 Kafka Topic 订阅（Consumer Group 隔离）
  - 支持 SASL/PLAINTEXT/SSL 认证
  - Offset 管理（从头/从尾/从指定时间）
  - 多分区并发消费

- **MC-02**: Webhook 接收网关
  - HTTP POST 接收云平台/SaaS 安全产品告警
  - IP 白名单鉴权
  - Header Secret 校验
  - 幂等去重（基于 message_id）

- **MC-03**: REST API / 数据库定时轮询
  - REST API 定时轮询（可配置间隔）
  - 支持 OAuth/Token/Basic 认证
  - 数据库 JDBC 轮询（支持 MySQL/PostgreSQL/达梦/openGauss/TiDB/Kingbase）
  - 递增游标字段配置（时间戳/自增ID）
  - 限流重试策略（Rate Limit / Backoff）

### SM: 采集监控与死信队列 (SM-01 ~ SM-02)

- **SM-01**: 死信队列 (DLQ) 机制
  - 解析失败日志自动路由到 DLQ Topic
  - 重试机制（默认 3 次，间隔 1min/5min/30min）
  - 超过重试上限后归档到 MinIO
  - DLQ 告警通知（管理员通知）
  - DLQ 消息重处理（人工/自动）

- **SM-02**: 采集可观测性监控
  - EPS（每秒事件数）监控：in/out 双向计数
  - 采集延迟（collection_lag_ms）监控
  - 解析成功率（parse_success_rate）监控
  - DLQ 大小（dlq_size）监控
  - 数据源健康状态（datasource_health）监控
  - Prometheus metrics 端点暴露

### GM: 全局元数据体系 (GM-01 ~ GM-02)

- **GM-01**: 全局元数据强制注入
  - 强制要求 vendor_name / product_name / device_type
  - 强制要求 tenant_id（MSSP 多租户）/ environment（prod/dev/test）
  - 元数据验证与默认值填充
  - 模板级别的元数据覆盖

- **GM-02**: OCSF Target Mapping
  - target_category_uid / target_class_uid 映射
  - 设备类型到 OCSF 事件类别的自动推断
  - OCSF 格式校验与合规性检查

---

## Future Requirements

- 配置版本化与回滚 — v1.6
- 背压机制（HTTP 429 反馈控制） — v1.6+
- 自适应采集速率 — v1.6+
- DLQ 自动重试与回刷 — v1.6+
- 国产数据库驱动完整适配验证 — v1.6+

---

## Traceability

| REQ-ID | Description | Phase | Status |
|--------|-------------|-------|--------|
| DI-01 | 数据源模板创建 UI | 14 | Pending |
| DI-02 | 数据源模板编辑 UI | 14 | Pending |
| DI-03 | 数据源模板删除 UI | 14 | Pending |
| DI-04 | 数据源模板列表查询 UI | 14 | Pending |
| DI-05 | 数据接入向导（4步骤）UI | 14 | Pending |
| DI-06 | 接入状态监控和诊断 UI | 14 | Pending |
| DI-07 | AI 自动识别日志格式 | 15 | Completed |
| DI-08 | 批量接入设备 | 15 | Completed |
| DI-09 | 解析测试 | 15 | Completed |
| MC-01 | Kafka Topic 订阅采集 | TBD | Pending |
| MC-02 | Webhook 接收网关 | TBD | Pending |
| MC-03 | REST API / 数据库定时轮询 | TBD | Pending |
| SM-01 | 死信队列 (DLQ) 机制 | TBD | Pending |
| SM-02 | 采集可观测性监控 | TBD | Pending |
| GM-01 | 全局元数据强制注入 | TBD | Pending |
| GM-02 | OCSF Target Mapping | TBD | Pending |
