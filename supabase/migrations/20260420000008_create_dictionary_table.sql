-- 创建数据字典表
CREATE TABLE IF NOT EXISTS dictionary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dictionary_type ON dictionary(type);
CREATE INDEX IF NOT EXISTS idx_dictionary_type_active ON dictionary(type, is_active);
CREATE INDEX IF NOT EXISTS idx_dictionary_code ON dictionary(code);
CREATE INDEX IF NOT EXISTS idx_dictionary_sort ON dictionary(sort_order);

-- 设置 RLS
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Allow all operations on dictionary" ON dictionary
  FOR ALL
  USING (true)
  WITH CHECK (true);
