-- 修改 logs 表的巡查区域，随机关联数据字典中的覆盖范围数据
-- 执行前请先确认 dictionary 表中已有 coverage_area 类型的数据

-- 步骤 1: 查看现有的覆盖范围数据（可选，用于确认）
SELECT id, code, name
FROM dictionary
WHERE type = 'coverage_area' AND is_active = true
ORDER BY name;

-- 步骤 2: 查看需要更新的日志数量
SELECT COUNT(*) as total_logs
FROM logs
WHERE coverage_area_id IS NULL OR coverage_area_id = '';

-- 步骤 3: 随机更新 logs 表的 coverage_area_id 和 coverage_area_name
-- 使用子查询为每条日志随机分配一个覆盖范围
WITH coverage_areas AS (
  SELECT id, name
  FROM dictionary
  WHERE type = 'coverage_area' AND is_active = true
),
logs_to_update AS (
  SELECT id
  FROM logs
  WHERE coverage_area_id IS NULL OR coverage_area_id = ''
)
UPDATE logs
SET
  coverage_area_id = (
    SELECT id FROM coverage_areas
    ORDER BY random()
    LIMIT 1
  ),
  coverage_area_name = (
    SELECT name FROM coverage_areas
    ORDER BY random()
    LIMIT 1
  )
WHERE id IN (SELECT id FROM logs_to_update);

-- 步骤 4: 验证更新结果
SELECT l.id, l.date, l.coverage_area_id, l.coverage_area_name,
       d.code as dict_code, d.name as dict_name
FROM logs l
JOIN dictionary d ON l.coverage_area_id = d.id
WHERE d.type = 'coverage_area'
LIMIT 10;
