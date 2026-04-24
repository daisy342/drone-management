-- 添加巡查基站和巡查航线字段到 logs 表
-- 用于支持巡查报告与数据字典的基站、航线关联

-- 添加巡查基站字段
ALTER TABLE logs ADD COLUMN IF NOT EXISTS base_id UUID REFERENCES dictionary(id);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS base_name TEXT;

-- 添加巡查航线字段
ALTER TABLE logs ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES dictionary(id);
ALTER TABLE logs ADD COLUMN IF NOT EXISTS route_name TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logs_base_id ON logs(base_id);
CREATE INDEX IF NOT EXISTS idx_logs_route_id ON logs(route_id);

-- 添加注释
COMMENT ON COLUMN logs.base_id IS '巡查基站ID，关联dictionary表中type=base_station的记录';
COMMENT ON COLUMN logs.base_name IS '巡查基站名称，冗余存储用于显示';
COMMENT ON COLUMN logs.route_id IS '巡查航线ID，关联dictionary表中type=route的记录';
COMMENT ON COLUMN logs.route_name IS '巡查航线名称，冗余存储用于显示';
