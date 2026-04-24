-- 添加日志表新字段（新报告结构）

-- 报告基础信息字段
ALTER TABLE logs ADD COLUMN IF NOT EXISTS report_number TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS weekday TEXT;

-- 巡查区域字段（省市区）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS district_code TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS district_name TEXT;

-- 天气信息
ALTER TABLE logs ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS temperature NUMERIC;

-- 巡查人员
ALTER TABLE logs ADD COLUMN IF NOT EXISTS inspectors TEXT[] DEFAULT '{}';

-- 关联日志
ALTER TABLE logs ADD COLUMN IF NOT EXISTS related_log_id TEXT;

-- 分析结论
ALTER TABLE logs ADD COLUMN IF NOT EXISTS analysis_conclusion TEXT;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS auto_generate_analysis BOOLEAN DEFAULT true;

-- 草稿标记
ALTER TABLE logs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- 更新现有数据（将旧字段映射到新字段）
-- 将旧的 status 'pending' 转换为 'draft'（草稿）
UPDATE logs SET status = 'draft' WHERE status = 'pending';
UPDATE logs SET is_draft = false WHERE status != 'draft';

-- 将旧的 time 字段改为可空并设置默认值
ALTER TABLE logs ALTER COLUMN time DROP NOT NULL;
ALTER TABLE logs ALTER COLUMN time SET DEFAULT '';

-- 将旧的必填字段改为可空
ALTER TABLE logs ALTER COLUMN base_id DROP NOT NULL;
ALTER TABLE logs ALTER COLUMN route_id DROP NOT NULL;
ALTER TABLE logs ALTER COLUMN area_id DROP NOT NULL;

-- 清理旧数据
UPDATE logs SET time = COALESCE(time, '');
UPDATE logs SET base_id = COALESCE(base_id, '');
UPDATE logs SET route_id = COALESCE(route_id, '');
UPDATE logs SET area_id = COALESCE(area_id, '');
