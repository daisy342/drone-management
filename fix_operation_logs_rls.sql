-- 更新操作日志的 RLS 策略，允许所有认证用户查看
DROP POLICY IF EXISTS "Allow admins to view operation logs" ON operation_logs;
DROP POLICY IF EXISTS "Allow authenticated users to view operation logs" ON operation_logs;

CREATE POLICY "Allow authenticated users to view operation logs" ON operation_logs
  FOR SELECT TO authenticated
  USING (true);
