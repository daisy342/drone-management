-- 统一日志表增强迁移
-- 这个迁移将logs表扩展到满足巡查报告管理系统的需求

-- 1. 添加新字段到logs表
-- 报告编号（格式：巡查报告-YYYYMMDD-XXX）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS report_number TEXT UNIQUE;

-- 星期（1-7，周一到周日）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- 分析报告摘要
ALTER TABLE logs ADD COLUMN IF NOT EXISTS analysis_summary TEXT;

-- 创建人（关联用户）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 提交审核时间
ALTER TABLE logs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- 审核人
ALTER TABLE logs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- 审核时间
ALTER TABLE logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 审核意见
ALTER TABLE logs ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- 省市区信息（如果还没有）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS district_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS district_name TEXT;

-- 天气信息
ALTER TABLE logs ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS temperature NUMERIC;

-- 巡查人员列表
ALTER TABLE logs ADD COLUMN IF NOT EXISTS inspectors TEXT[] DEFAULT '{}';

-- 关联的巡查记录ID
ALTER TABLE logs ADD COLUMN IF NOT EXISTS related_log_id UUID REFERENCES logs(id);

-- 巡查结论
ALTER TABLE logs ADD COLUMN IF NOT EXISTS analysis_conclusion TEXT;

-- 是否自动生成分析
ALTER TABLE logs ADD COLUMN IF NOT EXISTS auto_generate_analysis BOOLEAN DEFAULT false;

-- 草稿标记
ALTER TABLE logs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- 2. 修改状态字段支持新的状态值
-- 删除旧约束（如果存在）
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_status_check;

-- 添加新约束：draft(草稿), pending(待审核), approved(已通过), rejected(已退回), archived(已归档)
ALTER TABLE logs ADD CONSTRAINT logs_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'));

-- 3. 为logs表添加新的索引
CREATE INDEX IF NOT EXISTS idx_logs_report_number ON logs(report_number);
CREATE INDEX IF NOT EXISTS idx_logs_created_by ON logs(created_by);
CREATE INDEX IF NOT EXISTS idx_logs_submitted_at ON logs(submitted_at);
CREATE INDEX IF NOT EXISTS idx_logs_reviewed_by ON logs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_logs_day_of_week ON logs(day_of_week);

-- 4. 创建报告审核记录表
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

-- 5. 创建年度巡查计划表
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

-- 6. 创建报告编号生成函数
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_sequence INTEGER;
  v_report_number TEXT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 获取当日序号
  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM '\d{8}-(\d{3})$') AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM logs
  WHERE report_number LIKE '巡查报告-' || v_date || '-%';

  v_report_number := '巡查报告-' || v_date || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_report_number;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建自动更新updated_at的触发器函数
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

-- 8. 启用RLS（如果还没有启用）
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_plans ENABLE ROW LEVEL SECURITY;

-- 9. 创建RLS策略
-- logs表策略：所有登录用户可查看
DROP POLICY IF EXISTS "Users can view logs" ON logs;
CREATE POLICY "Users can view logs" ON logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- logs表策略：所有登录用户可插入
DROP POLICY IF EXISTS "Users can insert logs" ON logs;
CREATE POLICY "Users can insert logs" ON logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- logs表策略：所有登录用户可更新
DROP POLICY IF EXISTS "Users can update logs" ON logs;
CREATE POLICY "Users can update logs" ON logs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- logs表策略：所有登录用户可删除
DROP POLICY IF EXISTS "Users can delete logs" ON logs;
CREATE POLICY "Users can delete logs" ON logs
  FOR DELETE USING (auth.role() = 'authenticated');

-- report_reviews表策略
DROP POLICY IF EXISTS "Users can view report reviews" ON report_reviews;
CREATE POLICY "Users can view report reviews" ON report_reviews
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert report reviews" ON report_reviews;
CREATE POLICY "Users can insert report reviews" ON report_reviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- annual_plans表策略
DROP POLICY IF EXISTS "Users can view annual plans" ON annual_plans;
CREATE POLICY "Users can view annual plans" ON annual_plans
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can manage annual plans" ON annual_plans;
CREATE POLICY "Admin can manage annual plans" ON annual_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 10. 创建自动计算星期几的函数
CREATE OR REPLACE FUNCTION calculate_day_of_week()
RETURNS TRIGGER AS $$
BEGIN
  -- 根据date字段计算星期几（1-7，周一到周日）
  IF NEW.date IS NOT NULL THEN
    NEW.day_of_week := EXTRACT(ISODOW FROM TO_DATE(NEW.date, 'YYYY-MM-DD'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为logs表添加触发器，自动计算星期
DROP TRIGGER IF EXISTS trg_calculate_day_of_week ON logs;
CREATE TRIGGER trg_calculate_day_of_week
  BEFORE INSERT OR UPDATE ON logs
  FOR EACH ROW EXECUTE FUNCTION calculate_day_of_week();
