-- 扩展logs表，添加新字段
ALTER TABLE logs ADD COLUMN IF NOT EXISTS report_no TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS analysis_summary TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- 修改status字段支持新的状态值
-- 原状态：pending, reviewed, archived
-- 新状态：draft(草稿), pending(待审核), approved(已通过), rejected(已退回), archived(已归档)
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_status_check;
ALTER TABLE logs ADD CONSTRAINT logs_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'));

-- 为logs表添加新的索引
CREATE INDEX IF NOT EXISTS idx_logs_report_no ON logs(report_no);
CREATE INDEX IF NOT EXISTS idx_logs_created_by ON logs(created_by);
CREATE INDEX IF NOT EXISTS idx_logs_submitted_at ON logs(submitted_at);

-- 创建报告审核记录表
CREATE TABLE IF NOT EXISTS report_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'return', 'archive')),
  comment TEXT,
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为审核记录表创建索引
CREATE INDEX IF NOT EXISTS idx_report_reviews_report_id ON report_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_created_at ON report_reviews(created_at);

-- 创建年度巡查计划表
CREATE TABLE IF NOT EXISTS annual_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  base_id TEXT,
  target_inspections INTEGER DEFAULT 0,
  target_area NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 年度计划唯一约束（每个基地每年一条记录）
CREATE UNIQUE INDEX IF NOT EXISTS idx_annual_plans_year_base
  ON annual_plans(year, base_id) WHERE base_id IS NOT NULL;

-- 启用RLS
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_plans ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（先删除已存在的）
DROP POLICY IF EXISTS "Users can view all report reviews" ON report_reviews;
CREATE POLICY "Users can view all report reviews" ON report_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert report reviews" ON report_reviews;
CREATE POLICY "Users can insert report reviews" ON report_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can view annual plans" ON annual_plans;
CREATE POLICY "Users can view annual plans" ON annual_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage annual plans" ON annual_plans;
CREATE POLICY "Admin can manage annual plans" ON annual_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 创建报告编号生成函数
CREATE OR REPLACE FUNCTION generate_report_no()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_sequence INTEGER;
  v_report_no TEXT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 获取当日序号
  SELECT COALESCE(MAX(CAST(SUBSTRING(report_no FROM '\d{8}-(\d{3})$') AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM logs
  WHERE report_no LIKE '巡查报告-' || v_date || '-%';

  v_report_no := '巡查报告-' || v_date || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_report_no;
END;
$$ LANGUAGE plpgsql;

-- 创建自动更新updated_at的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为annual_plans添加更新触发器
DROP TRIGGER IF EXISTS update_annual_plans_updated_at ON annual_plans;
CREATE TRIGGER update_annual_plans_updated_at
  BEFORE UPDATE ON annual_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
