-- 修复旧字段约束问题

-- 将 time 字段改为可空
ALTER TABLE logs ALTER COLUMN time DROP NOT NULL;

-- 将旧的必填字段改为可空
ALTER TABLE logs ALTER COLUMN base_id DROP NOT NULL;
ALTER TABLE logs ALTER COLUMN route_id DROP NOT NULL;
ALTER TABLE logs ALTER COLUMN area_id DROP NOT NULL;

-- 设置默认值
ALTER TABLE logs ALTER COLUMN time SET DEFAULT '';
ALTER TABLE logs ALTER COLUMN base_id SET DEFAULT '';
ALTER TABLE logs ALTER COLUMN route_id SET DEFAULT '';
ALTER TABLE logs ALTER COLUMN area_id SET DEFAULT '';

-- 更新现有数据
UPDATE logs SET time = COALESCE(time, '');
UPDATE logs SET base_id = COALESCE(base_id, '');
UPDATE logs SET route_id = COALESCE(route_id, '');
UPDATE logs SET area_id = COALESCE(area_id, '');
