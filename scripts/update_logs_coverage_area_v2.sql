-- 修改 logs 表的巡查区域，随机关联数据字典中的覆盖范围数据
-- 版本 2：确保 coverage_area_id 和 coverage_area_name 一致

-- 步骤 1: 查看现有的覆盖范围数据
SELECT id, code, name
FROM dictionary
WHERE type = 'coverage_area' AND is_active = true
ORDER BY name;

-- 步骤 2: 查看需要更新的日志数量
SELECT COUNT(*) as total_logs
FROM logs
WHERE coverage_area_id IS NULL;

-- 步骤 3: 使用 window 函数确保 id 和 name 匹配
WITH coverage_areas AS (
  SELECT id, name, row_number() OVER (ORDER BY random()) as rn
  FROM dictionary
  WHERE type = 'coverage_area' AND is_active = true
),
logs_needing_update AS (
  SELECT id, row_number() OVER (ORDER BY random()) as rn
  FROM logs
  WHERE coverage_area_id IS NULL
),
-- 计算匹配数量
match_count AS (
  SELECT 
    (SELECT COUNT(*) FROM coverage_areas) as area_count,
    (SELECT COUNT(*) FROM logs_needing_update) as log_count
)
UPDATE logs l
SET 
  coverage_area_id = ca.id,
  coverage_area_name = ca.name
FROM logs_needing_update lnu
JOIN coverage_areas ca ON (lnu.rn % (SELECT area_count FROM match_count)) + 1 = ca.rn
WHERE l.id = lnu.id;

-- 步骤 4: 验证更新结果
SELECT l.id, l.date, l.coverage_area_id, l.coverage_area_name,
       d.code as dict_code, d.name as dict_name
FROM logs l
JOIN dictionary d ON l.coverage_area_id = d.id
WHERE d.type = 'coverage_area'
ORDER BY l.date DESC
LIMIT 20;
