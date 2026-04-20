-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为角色表创建索引
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- 插入默认角色数据
INSERT INTO roles (id, name, code, description, permissions, created_at) VALUES
  (gen_random_uuid(), '管理员', 'admin', '系统管理员，拥有所有权限', ARRAY['all'], NOW()),
  (gen_random_uuid(), '普通用户', 'user', '普通用户，可进行日常操作', ARRAY['logs:read', 'logs:create', 'analysis:read'], NOW()),
  (gen_random_uuid(), '查看者', 'viewer', '仅可查看数据，无法修改', ARRAY['logs:read', 'analysis:read'], NOW())
ON CONFLICT (code) DO NOTHING;

-- 启用 Row Level Security (RLS)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许所有已认证用户查看角色
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 创建策略，允许管理员管理角色
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 创建 updated_at 自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：自动更新 roles 表的 updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
