/**
 * 数据接入类型定义
 */

// 设备类型
export type DeviceType = 'firewall' | 'ids' | 'vpn' | 'switch' | 'router' | 'waf' | 'other';

// 设备类型元数据
export interface DeviceTypeInfo {
  id: DeviceType;
  label: string;
  icon: string;  // lucide 图标名
}

// 日志格式
export type LogFormat = 'CEF' | 'Syslog' | 'JSON' | 'Auto' | 'Custom' | 'CustomPython';

// 日志格式元数据
export interface LogFormatInfo {
  id: LogFormat;
  label: string;
  description: string;
}

// 连接配置
export interface ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: string;  // ssh, snmp, http, jdbc
}

// 数据源模板
export interface DataSourceTemplate {
  id: string;
  name: string;
  device_type: DeviceType;
  connection: ConnectionConfig;
  log_format: LogFormat;
  custom_regex?: string;
}

// 数据源健康状态 (DI-06)
export type HealthStatus = 'online' | 'offline' | 'warning';

// 数据源状态 (DI-06)
export interface DataSourceStatus {
  template_id: string;
  status: HealthStatus;
  last_sync?: string;  // ISO 时间戳
  events_received?: number;  // 接收事件数
  error_message?: string;  // 错误信息
}

// AI 识别结果 (DI-07)
export interface LogFormatRecognitionResult {
  detected_format: string;  // 检测到的格式：CEF/Syslog/JSON/Custom
  regex_pattern: string;  // Python 正则表达式，包含命名捕获组
  field_mappings: Record<string, string>;  // 字段映射 {目标字段: 源字段}
  confidence: number;  // 置信度 0.0-1.0
  reasoning: string;  // 识别理由
}

// 向导状态
export interface WizardState {
  step: number;
  deviceType: DeviceType | null;
  connection: ConnectionConfig | null;
  logFormat: LogFormat | null;
  customRegex: string | null;
  templateName: string;
}

// 向导步骤元数据
export interface WizardStep {
  num: number;
  label: string;
}

// 设备类型列表
export const DEVICE_TYPES: DeviceTypeInfo[] = [
  { id: 'firewall', label: '防火墙', icon: 'ShieldAlert' },
  { id: 'ids', label: '入侵检测系统', icon: 'Network' },
  { id: 'vpn', label: 'VPN', icon: 'Key' },
  { id: 'switch', label: '交换机', icon: 'Server' },
  { id: 'router', label: '路由器', icon: 'Globe' },
  { id: 'waf', label: 'Web应用防火墙', icon: 'Shield' },
  { id: 'other', label: '其他设备', icon: 'MoreHorizontal' },
];

// 日志格式列表
export const LOG_FORMATS: LogFormatInfo[] = [
  { id: 'CEF', label: 'CEF (Common Event Format)', description: '通用事件格式' },
  { id: 'Syslog', label: 'Syslog (标准格式)', description: '标准 syslog 格式' },
  { id: 'JSON', label: 'JSON (结构化日志)', description: 'JSON 结构化日志' },
  { id: 'Auto', label: '自动识别', description: '系统自动识别日志格式' },
  { id: 'Custom', label: '自定义正则', description: '用户自定义正则表达式' },
  { id: 'CustomPython', label: '自定义解析器', description: '用户上传 Python 代码解析日志' },
];

// 向导步骤
export const WIZARD_STEPS: WizardStep[] = [
  { num: 1, label: '设备类型' },
  { num: 2, label: '连接参数' },
  { num: 3, label: '日志格式' },
  { num: 4, label: '完成' },
];
