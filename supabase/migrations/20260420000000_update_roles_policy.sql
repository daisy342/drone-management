-- 删除旧的策略
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

-- 创建新策略：所有已认证用户都能管理角色
CREATE POLICY "Authenticated users can manage roles" ON roles
  FOR ALL USING (auth.role() = 'authenticated');
