-- 创建操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  action_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  target_type TEXT NOT NULL, -- USER, ROLE, DICTIONARY, etc.
  target_id TEXT, -- 被操作对象ID
  target_name TEXT, -- 被操作对象名称（冗余存储便于展示）
  old_values JSONB, -- 修改前的值
  new_values JSONB, -- 修改后的值
  description TEXT, -- 操作描述
  ip_address TEXT, -- IP地址
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action_type ON operation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_target_type ON operation_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_username ON operation_logs(username);

-- 启用 RLS
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：所有认证用户可以查看操作日志
CREATE POLICY "Allow authenticated users to view operation logs" ON operation_logs
  FOR SELECT TO authenticated
  USING (true);

-- 创建策略：允许插入（由触发器或服务层使用）
CREATE POLICY "Allow authenticated users to insert operation logs" ON operation_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 创建查询操作日志的函数
CREATE OR REPLACE FUNCTION get_operation_logs(
  p_user_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  action_type TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ol.id,
    ol.user_id,
    ol.username,
    ol.action_type,
    ol.target_type,
    ol.target_id,
    ol.target_name,
    ol.old_values,
    ol.new_values,
    ol.description,
    ol.ip_address,
    ol.created_at
  FROM operation_logs ol
  WHERE
    (p_user_id IS NULL OR ol.user_id = p_user_id)
    AND (p_action_type IS NULL OR ol.action_type = p_action_type)
    AND (p_target_type IS NULL OR ol.target_type = p_target_type)
    AND (p_start_date IS NULL OR ol.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ol.created_at <= p_end_date)
  ORDER BY ol.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建插入操作日志的函数
CREATE OR REPLACE FUNCTION create_operation_log(
  p_user_id UUID,
  p_username TEXT,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO operation_logs (
    user_id,
    username,
    action_type,
    target_type,
    target_id,
    target_name,
    old_values,
    new_values,
    description,
    ip_address
  ) VALUES (
    p_user_id,
    p_username,
    p_action_type,
    p_target_type,
    p_target_id,
    p_target_name,
    p_old_values,
    p_new_values,
    p_description,
    p_ip_address
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
