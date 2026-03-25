-- AI 助手对话会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL DEFAULT 'default_user',
    context_type VARCHAR(32) NOT NULL DEFAULT 'global',
    context_entity_id VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI 助手对话消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    context_snapshot JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 消息索引
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, created_at);
