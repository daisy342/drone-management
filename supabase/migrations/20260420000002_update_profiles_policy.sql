-- 修改 profiles 表的 RLS 策略

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;

-- 创建新策略：允许任何人插入新用户（用于测试环境）
CREATE POLICY "Allow insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- 删除并重新创建更新策略
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

-- 允许任何人更新（用于测试环境）
CREATE POLICY "Allow update profiles" ON profiles
  FOR UPDATE USING (true);

-- 删除并重新创建删除策略
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- 允许任何人删除（用于测试环境）
CREATE POLICY "Allow delete profiles" ON profiles
  FOR DELETE USING (true);
