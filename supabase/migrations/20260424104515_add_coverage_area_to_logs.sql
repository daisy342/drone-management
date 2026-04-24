-- 添加日志表的覆盖范围字段
-- 用于支持从数据字典选择覆盖范围作为巡查区域

-- 添加覆盖范围ID字段（关联dictionary表）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS coverage_area_id UUID REFERENCES dictionary(id);

-- 添加覆盖范围名称字段（冗余存储，方便查询显示）
ALTER TABLE logs ADD COLUMN IF NOT EXISTS coverage_area_name TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logs_coverage_area_id ON logs(coverage_area_id);

-- 数据迁移：将现有数据的省市区信息转换为覆盖范围名称格式
-- 这一步是可选的，主要用于数据兼容性
UPDATE logs SET coverage_area_name = COALESCE(
  NULLIF(TRIM(CONCAT(
    COALESCE(province_name, ''), '/',
    COALESCE(city_name, ''), '/',
    COALESCE(district_name, '')
  )), '//'),
  province_name,
  city_name,
  district_name,
  '未指定区域'
)
WHERE coverage_area_name IS NULL OR coverage_area_name = '';

-- 注释说明
COMMENT ON COLUMN logs.coverage_area_id IS '覆盖范围ID，关联dictionary表中type=coverage_area的记录';
COMMENT ON COLUMN logs.coverage_area_name IS '覆盖范围名称，冗余存储用于显示';
