/**
 * AI Copilot 面板组件
 * 提供上下文感知的 AI 辅助分析功能 - Tactical Command Center 风格
 * 可折叠的 320px 右侧面板
 * 支持联动: 当前页面、选中的告警、选中的实体
 */

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, AlertCircle, BarChart3, Shield, Settings, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useChatStore } from '../../stores/chatStore';
import { createSession, streamChat, filterSensitiveInfo } from '../../api/chat';
import type { AISuggestion } from '../../types/analysis';

// 页面上下文类型
type PageContext = 'dashboard' | 'alerts' | 'analysis' | 'attack-graph' | 'timeline' | 'hunting' | 'assets' | 'settings';

// 获取页面上下文
function getPageContext(pathname: string): { page: PageContext; name: string; icon: React.ReactNode } {
  if (pathname.startsWith('/analysis/graph')) {
    return { page: 'attack-graph', name: '攻击路径分析', icon: <BarChart3 className="w-3 h-3" /> };
  }
  if (pathname.startsWith('/analysis/timeline')) {
    return { page: 'timeline', name: '时间线分析', icon: <AlertCircle className="w-3 h-3" /> };
  }
  if (pathname.startsWith('/analysis/hunting')) {
    return { page: 'hunting', name: '威胁狩猎', icon: <Shield className="w-3 h-3" /> };
  }
  if (pathname.startsWith('/analysis/assets')) {
    return { page: 'assets', name: '资产视图', icon: <BarChart3 className="w-3 h-3" /> };
  }
  if (pathname.startsWith('/analysis')) {
    return { page: 'analysis', name: '分析工作台', icon: <AlertCircle className="w-3 h-3" /> };
  }
  if (pathname.startsWith('/alerts')) {
    return { page: 'alerts', name: '告警列表', icon: <AlertCircle className="w-3 h-3" /> };
  }
  if (pathname === '/settings') {
    return { page: 'settings', name: '系统设置', icon: <Settings className="w-3 h-3" /> };
  }
  return { page: 'dashboard', name: '仪表盘', icon: <BarChart3 className="w-3 h-3" /> };
}

// AIPanel 属性
export interface AIPanelProps {
  onExport?: (format: 'pdf' | 'markdown' | 'json') => void;
}

export function AIPanel({ onExport }: AIPanelProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前页面上下文
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);

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
  }, [pageContext, selectedStorylineId, selectedEntityId, selectedEntityType, showChat]);

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

    // 流式获取响应
    await streamChat(
      userMessage,
      currentSessionId,
      chatContext,
      // onChunk
      (token) => {
        updateLastMessage((prev: string) => filterSensitiveInfo(prev + token));
      },
      // onDone
      () => {
        setStreaming(false);
      },
      // onError
      (error) => {
        updateLastMessage((prev: string) => prev + `\n\n[错误: ${error.message}]`);
        setStreaming(false);
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
    <aside className="w-80 bg-surface border-l border-border flex flex-col relative shrink-0">
      {/* 顶部 accent 线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent via-accent/50 to-transparent" />

      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-heading font-semibold text-slate-200">AI Copilot</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-accent/70">
              {pageContext.icon}
              {pageContext.name}
            </span>
          </p>
        </div>
        <button
          onClick={toggleCopilot}
          className="p-1.5 rounded hover:bg-accent/10 text-slate-400 hover:text-accent transition-colors duration-150"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 查询输入 */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的安全问题..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 resize-none"
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isStreaming}
            className="absolute right-2 bottom-2 p-2 bg-accent/10 rounded-lg border border-accent/50 text-accent hover:bg-accent/20 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 内容区域：聊天消息 或 智能推荐 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {showChat ? (
          /* 聊天消息视图 */
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center text-slate-500 text-sm py-8">
                <p>开始对话吧！</p>
                <p className="text-xs mt-1">当前上下文：{pageContext.name}</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-accent/20 border border-accent/30 text-accent'
                      : 'bg-surface/50 border border-border text-slate-300'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1 text-xs text-accent/70">
                      <Bot className="w-3 h-3" />
                      <span>AI</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* 智能推荐视图 */
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-heading font-medium text-slate-400 uppercase tracking-wide">智能推荐</h3>
              {messages.length > 0 && (
                <button
                  onClick={() => setShowChat(true)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  查看对话 ({messages.length})
                </button>
              )}
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 bg-surface/50 border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-accent">
                      {suggestion.action}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {suggestion.reasoning}
                  </p>
                  {suggestion.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {suggestion.evidence.map((e, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 text-xs bg-accent/10 border border-accent/20 rounded text-slate-400"
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

      {/* 导出功能 */}
      <div className="p-3 border-t border-border">
        <h3 className="text-xs font-heading font-medium text-slate-400 mb-2 uppercase tracking-wide">证据导出</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onExport?.('pdf')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            PDF
          </button>
          <button
            onClick={() => onExport?.('markdown')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            Markdown
          </button>
          <button
            onClick={() => onExport?.('json')}
            className="flex-1 py-1.5 px-3 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-xs rounded transition-colors duration-150"
          >
            JSON
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AIPanel;
