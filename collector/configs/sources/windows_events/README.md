# Windows Event Log 采集配置

## 架构
Windows Event Log → nxlog → Syslog → Vector → Kafka

## 部署步骤

1. 下载 nxlog Community Edition:
   https://nxlog.co/products/nxlog-ce-community-edition/download

2. 配置 nxlog.conf:
   - 修改 Host 为 Vector 服务器地址
   - 根据需要调整 Query 过滤规则

3. 启动 nxlog 服务:
   sc start nxlog

## 支持的 Windows 版本
- Windows Server 2012 R2+
- Windows 10/11 Enterprise

## 权限要求
- 读取 Security 日志需要管理员权限
- 读取 Application/System 日志需要 Local Service 或更高权限
