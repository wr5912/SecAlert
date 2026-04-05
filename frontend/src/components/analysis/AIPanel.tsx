/**
 * AI Copilot 面板组件
 * 提供上下文感知的 AI 辅助分析功能 - Tactical Command Center 风格
 * 可折叠的 320px 右侧面板
 * 支持联动: 当前页面、选中的告警、选中的实体
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, X, AlertCircle, BarChart3, Shield, Settings, Loader2, MessageSquare, Sparkles, FileText, FileCode, FileJson } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useChatStore } from '../../stores/chatStore';
import { createSession, streamChatWebSocket, filterSensitiveInfo } from '../../api/chat';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { AISuggestion } from '../../types/analysis';

// 页面上下文类型
type PageContextType = 'dashboard' | 'alerts' | 'analysis' | 'attack-graph' | 'timeline' | 'hunting' | 'assets' | 'settings';

// 页面上下文配置
const PAGE_CONTEXTS: Record<PageContextType, { name: string; icon: React.ReactNode }> = {
  'dashboard': { name: '仪表盘', icon: <BarChart3 className="w-3 h-3" /> },
  'alerts': { name: '告警列表', icon: <AlertCircle className="w-3 h-3" /> },
  'analysis': { name: '分析工作台', icon: <AlertCircle className="w-3 h-3" /> },
  'attack-graph': { name: '攻击路径分析', icon: <BarChart3 className="w-3 h-3" /> },
  'timeline': { name: '时间线分析', icon: <AlertCircle className="w-3 h-3" /> },
  'hunting': { name: '威胁狩猎', icon: <Shield className="w-3 h-3" /> },
  'assets': { name: '资产视图', icon: <BarChart3 className="w-3 h-3" /> },
  'settings': { name: '系统设置', icon: <Settings className="w-3 h-3" /> },
};

// 获取页面上下文
function getPageKey(pathname: string): PageContextType {
  if (pathname.startsWith('/analysis/graph')) return 'attack-graph';
  if (pathname.startsWith('/analysis/timeline')) return 'timeline';
  if (pathname.startsWith('/analysis/hunting')) return 'hunting';
  if (pathname.startsWith('/analysis/assets')) return 'assets';
  if (pathname.startsWith('/analysis')) return 'analysis';
  if (pathname.startsWith('/alerts')) return 'alerts';
  if (pathname === '/settings') return 'settings';
  return 'dashboard';
}

// AIPanel 属性
export interface AIPanelProps {
  onExport?: (format: 'pdf' | 'markdown' | 'json') => void;
}

export function AIPanel({ onExport }: AIPanelProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [panelWidth, setPanelWidth] = useState(320); // 默认宽度 320px
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 拖动调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      // 限制最小 240px，最大 600px
      const clampedWidth = Math.min(Math.max(newWidth, 240), 600);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 获取当前页面上下文 - 使用 useMemo 避免无限循环
  const location = useLocation();
  const page = useMemo(() => getPageKey(location.pathname), [location.pathname]);
  const pageContext = useMemo(
    () => ({ page, ...PAGE_CONTEXTS[page] }),
    [page]
  );

  // 从 analysisStore 获取上下文
  const selectedStorylineId = useAnalysisStore((state) => state.selectedStorylineId);
  const selectedEntityId = useAnalysisStore((state) => state.selectedEntityId);
  const selectedEntityType = useAnalysisStore((state) => state.selectedEntityType);
  const copilotOpen = useAnalysisStore((state) => state.copilotOpen);
  const toggleCopilot = useAnalysisStore((state) => state.toggleCopilot);

  // 从 chatStore 获取消息和状态
  const messages = useChatStore((state) => state.messages);
  const sessionId = useChatStore((state) => state.sessionId);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const setSessionId = useChatStore((state) => state.setSessionId);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateLastMessage = useChatStore((state) => state.updateLastMessage);
  const setStreaming = useChatStore((state) => state.setStreaming);

  // 构建 chat context
  const chatContext = {
    type: selectedStorylineId ? 'chain' as const : selectedEntityId ? 'list' as const : pageContext.page === 'dashboard' ? 'dashboard' as const : 'global' as const,
    chain_id: selectedStorylineId || undefined,
    asset_ip: selectedEntityType === 'ip' ? selectedEntityId || undefined : undefined,
  };

  // 当上下文变化时，更新智能推荐
  useEffect(() => {
    if (showChat) return; // 聊天模式下不显示建议

    const newSuggestions: AISuggestion[] = [];

    // 1. 基于当前页面添加建议
    switch (pageContext.page) {
      case 'dashboard':
        newSuggestions.push({
          action: '查看高危告警',
          reasoning: '当前在仪表盘，建议查看最新的高危和严重告警',
          confidence: 0.85,
          evidence: ['仪表盘视图', '实时告警'],
        });
        break;
      case 'alerts':
        newSuggestions.push({
          action: '筛选高危告警',
          reasoning: '当前在告警列表页面，可以按严重度筛选查看关键告警',
          confidence: 0.8,
          evidence: ['告警列表', '支持多维度筛选'],
        });
        break;
      case 'analysis':
        newSuggestions.push({
          action: '查看告警详情',
          reasoning: '在分析工作台中，选择告警故事线以查看详细攻击链',
          confidence: 0.75,
          evidence: ['分析工作台', '故事线聚类'],
        });
        break;
      case 'attack-graph':
        newSuggestions.push({
          action: '分析攻击路径',
          reasoning: '当前在攻击路径分析视图，可以深入理解攻击链',
          confidence: 0.9,
          evidence: ['攻击路径图', '实体关联'],
        });
        break;
      case 'timeline':
        newSuggestions.push({
          action: '查看时间线',
          reasoning: '在时间线视图中，可以按时间顺序查看告警序列',
          confidence: 0.85,
          evidence: ['时间线分析', '时序关联'],
        });
        break;
      case 'hunting':
        newSuggestions.push({
          action: '执行威胁狩猎',
          reasoning: '在威胁狩猎模块，可以基于 IoC 指标进行主动搜索',
          confidence: 0.8,
          evidence: ['威胁狩猎', 'IoC 搜索'],
        });
        break;
      case 'assets':
        newSuggestions.push({
          action: '查看资产详情',
          reasoning: '在资产视图中，选择资产以查看其告警历史和关联实体',
          confidence: 0.75,
          evidence: ['资产视图', '实体分析'],
        });
        break;
      case 'settings':
        newSuggestions.push({
          action: '配置告警规则',
          reasoning: '在设置页面，可以配置告警规则和通知渠道',
          confidence: 0.7,
          evidence: ['系统设置', '规则配置'],
        });
        break;
    }

    // 2. 基于选中的故事线添加建议
    if (selectedStorylineId) {
      newSuggestions.push({
        action: '查看攻击路径',
        reasoning: `当前选择了故事线 ${selectedStorylineId}，建议查看详细攻击路径以了解攻击链全貌`,
        confidence: 0.9,
        evidence: ['关联告警数量 > 5', '置信度 > 80%'],
      });
    }

    // 3. 基于选中的实体添加建议
    if (selectedEntityId) {
      const entityTypeLabel = selectedEntityType || '未知类型';
      newSuggestions.push({
        action: `查询 ${entityTypeLabel} 历史`,
        reasoning: `选中了实体 ${selectedEntityId}，可以查看该实体的历史活动记录`,
        confidence: 0.85,
        evidence: ['实体类型匹配', '最近 24 小时有活动'],
      });
    }

    // 如果没有任何上下文，显示默认建议
    if (newSuggestions.length === 0) {
      newSuggestions.push({
        action: '开始分析',
        reasoning: '选择一个告警或实体，AI 将为您提供深入分析',
        confidence: 0.5,
        evidence: ['等待用户选择'],
      });
    }

    setSuggestions(newSuggestions);
  }, [page, selectedStorylineId, selectedEntityId, selectedEntityType, showChat]);

  // 自动滚动到最新消息
  useEffect(() => {
    if (showChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  // 处理查询提交
  const handleSubmit = async () => {
    if (!query.trim() || isStreaming) return;

    const userMessage = query.trim();
    setQuery('');
    setShowChat(true);

    // 添加用户消息
    addMessage({ role: 'user', content: userMessage });

    // 确保有会话ID
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const response = await createSession(chatContext.type, chatContext.chain_id);
        currentSessionId = response.session_id;
        setSessionId(currentSessionId);
      } catch (e) {
        console.error('Failed to create session:', e);
        addMessage({
          role: 'assistant',
          content: '创建会话失败，请重试。'
        });
        return;
      }
    }

    // 添加空助手消息占位
    addMessage({ role: 'assistant', content: '' });
    setStreaming(true);
    setWsStatus('connecting');

    // 流式获取响应 (使用 WebSocket)
    streamChatWebSocket(
      userMessage,
      currentSessionId,
      chatContext,
      // onChunk
      (token) => {
        setWsStatus('connected');
        updateLastMessage((prev: string) => filterSensitiveInfo(prev + token));
      },
      // onDone
      () => {
        setStreaming(false);
        setWsStatus('idle');
      },
      // onError
      (error) => {
        setWsStatus('error');
        updateLastMessage((prev: string) => prev + `\n\n[错误: ${error.message}]`);
        setStreaming(false);
        // 3秒后重置状态
        setTimeout(() => setWsStatus('idle'), 3000);
      }
    );
  };

  // 处理 Enter 键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 如果面板未打开则不渲染
  if (!copilotOpen) return null;

  return (
    <aside
      ref={panelRef}
      className="bg-surface/95 backdrop-blur-md border-l border-border/50 flex flex-col fixed right-0 top-0 h-screen z-50 shadow-xl"
      style={{ width: panelWidth }}
    >
      {/* 拖动调整把手 - 左侧 */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize group z-10",
          "hover:bg-accent/30 transition-colors",
          isResizing && "bg-accent/50"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-text-muted/30",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isResizing && "opacity-100"
        )} />
      </div>

      {/* 顶部渐变线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className={cn(
          "p-2.5 rounded-xl border transition-all",
          "bg-accent/10 border-accent/20 text-accent",
          "shadow-[0_0_15px_rgba(0,240,255,0.15)]"
        )}>
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-heading font-semibold text-text-primary">AI Copilot</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 border border-accent/20 rounded text-accent">
              {pageContext.icon}
              {pageContext.name}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleCopilot}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 内容区域：聊天消息 或 智能推荐 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {showChat ? (
          /* 聊天消息视图 */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-accent" />
                </div>
                <p className="text-sm font-medium text-text-primary mb-1">开始对话</p>
                <p className="text-xs text-text-muted">当前上下文：{pageContext.name}</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex animate-fade-in",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] p-4 rounded-2xl transition-all",
                    msg.role === 'user'
                      ? 'bg-accent/15 border border-accent/20 text-text-primary rounded-tr-md'
                      : 'bg-surface-hover border border-border/50 text-text-primary rounded-tl-md'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-accent/70">
                      <Sparkles className="w-3 h-3" />
                      <span>AI 助手</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed [&>p]:my-1 [&>h1]:my-2 [&>h1]:text-lg [&>h2]:my-2 [&>h2]:text-base [&>h3]:my-2 [&>h3]:text-sm [&>h3]:font-semibold [&>p]:leading-relaxed [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5 [&>code]:text-accent [&>code]:bg-surface-hover [&>code]:px-1 [&>code]:rounded [&>code]:before:content-none [&>code]:after:content-none [&>pre]:my-2 [&>pre]:bg-[#0a0f1a] [&>pre]:border [&>pre]:border-border/50 [&>pre]:p-3 [&>pre]:rounded-lg [&>table]:text-xs [&>thead]:border-b [&>th]:pb-1 [&>td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-surface-hover border border-border/50 p-4 rounded-2xl rounded-tl-md max-w-[85%]">
                  <div className="flex items-center gap-2 text-xs text-accent/70">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>AI 正在分析...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* 智能推荐视图 */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-heading font-medium text-text-secondary uppercase tracking-wide">智能推荐</h3>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(true)}
                  className="text-xs h-7 gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  查看对话 ({messages.length})
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    "bg-surface/50 border-border/50 hover:border-accent/30 hover:bg-surface-hover",
                    "animate-slide-in-up"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-accent text-sm">
                      {suggestion.action}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs bg-surface-hover border border-border rounded text-text-muted font-mono">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3 leading-relaxed">
                    {suggestion.reasoning}
                  </p>
                  {suggestion.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.evidence.map((e, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-accent/5 border border-accent/10 rounded-md text-text-muted"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 查询输入 - 放在底部 */}
      <div className="p-4 border-t border-border/50 shrink-0">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的安全问题..."
            className="w-full rounded-xl border border-border bg-[#0a0f1a]/80 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 resize-none transition-all"
            rows={2}
            disabled={isStreaming}
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={!query.trim() || isStreaming}
            className="absolute right-2 bottom-2 shadow-md"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {/* 连接状态指示器 */}
        {wsStatus !== 'idle' && (
          <div className="mt-2 flex items-center gap-2">
            {wsStatus === 'connecting' && (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-yellow-500">正在连接...</span>
              </>
            )}
            {wsStatus === 'connected' && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-500">已连接</span>
              </>
            )}
            {wsStatus === 'error' && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-500">连接异常</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 导出功能 */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-3.5 h-3.5 text-text-muted" />
          <h3 className="text-xs font-heading font-medium text-text-secondary uppercase tracking-wide">证据导出</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { format: 'pdf', icon: FileText, label: 'PDF' },
            { format: 'markdown', icon: FileCode, label: 'MD' },
            { format: 'json', icon: FileJson, label: 'JSON' },
          ].map(({ format, icon: Icon, label }) => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              onClick={() => onExport?.(format as 'pdf' | 'markdown' | 'json')}
              className="gap-1.5 text-xs h-8"
            >
              <Icon className="w-3 h-3" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default AIPanel;
