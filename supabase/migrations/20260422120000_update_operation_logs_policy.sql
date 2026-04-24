-- 更新操作日志的RLS策略，允许所有认证用户查看
DROP POLICY IF EXISTS "Allow admins to view operation logs" ON operation_logs;

-- 创建新的策略：所有认证用户都可以查看操作日志
CREATE POLICY "Allow authenticated users to view operation logs" ON operation_logs
  FOR SELECT TO authenticated
  USING (true);
