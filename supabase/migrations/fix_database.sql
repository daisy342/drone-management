-- 修复数据库表和策略
-- 这个脚本会删除已存在的策略并重新创建，确保没有冲突

-- 1. 创建 profiles 表（如果不存在）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2. 启用所有表的 RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 删除已存在的策略（表创建后安全删除）
DROP POLICY IF EXISTS "Users can view logs" ON logs;
DROP POLICY IF EXISTS "Users can insert logs" ON logs;
DROP POLICY IF EXISTS "Users can update logs" ON logs;
DROP POLICY IF EXISTS "Users can delete logs" ON logs;

DROP POLICY IF EXISTS "Users can view bases" ON bases;
DROP POLICY IF EXISTS "Users can insert bases" ON bases;
DROP POLICY IF EXISTS "Users can update bases" ON bases;
DROP POLICY IF EXISTS "Users can delete bases" ON bases;

DROP POLICY IF EXISTS "Users can view routes" ON routes;
DROP POLICY IF EXISTS "Users can insert routes" ON routes;
DROP POLICY IF EXISTS "Users can update routes" ON routes;
DROP POLICY IF EXISTS "Users can delete routes" ON routes;

DROP POLICY IF EXISTS "Users can view areas" ON areas;
DROP POLICY IF EXISTS "Users can insert areas" ON areas;
DROP POLICY IF EXISTS "Users can update areas" ON areas;
DROP POLICY IF EXISTS "Users can delete areas" ON areas;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 4. 创建新的策略
-- logs表策略
CREATE POLICY "Users can view logs" ON logs FOR SELECT USING (true);
CREATE POLICY "Users can insert logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update logs" ON logs FOR UPDATE USING (true);
CREATE POLICY "Users can delete logs" ON logs FOR DELETE USING (true);

-- bases表策略
CREATE POLICY "Users can view bases" ON bases FOR SELECT USING (true);
CREATE POLICY "Users can insert bases" ON bases FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update bases" ON bases FOR UPDATE USING (true);
CREATE POLICY "Users can delete bases" ON bases FOR DELETE USING (true);

-- routes表策略
CREATE POLICY "Users can view routes" ON routes FOR SELECT USING (true);
CREATE POLICY "Users can insert routes" ON routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update routes" ON routes FOR UPDATE USING (true);
CREATE POLICY "Users can delete routes" ON routes FOR DELETE USING (true);

-- areas表策略
CREATE POLICY "Users can view areas" ON areas FOR SELECT USING (true);
CREATE POLICY "Users can insert areas" ON areas FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update areas" ON areas FOR UPDATE USING (true);
CREATE POLICY "Users can delete areas" ON areas FOR DELETE USING (true);

-- profiles表策略
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. 创建自动创建用户资料的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();