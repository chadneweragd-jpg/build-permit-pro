-- Migration 004: User Feedback & Bug Reporter
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT,
    url TEXT NOT NULL,
    message TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert user_feedback" ON user_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read user_feedback" ON user_feedback FOR SELECT USING (true);
