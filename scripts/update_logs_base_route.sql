-- 更新巡查报告历史数据中的巡查基站和巡查航线
-- 将所有非空的 base_name 和 route_name 更新为指定的值

-- 先查看当前有哪些基站和航线数据
SELECT DISTINCT base_name, route_name FROM logs WHERE base_name IS NOT NULL OR route_name IS NOT NULL;

-- 更新所有巡查报告的基站为"礼嘉站"，航线为"礼嘉的测试航线"
UPDATE logs
SET
  base_name = '礼嘉站',
  route_name = '礼嘉的测试航线'
WHERE base_name IS NOT NULL
   OR route_name IS NOT NULL
   OR base_id IS NOT NULL
   OR route_id IS NOT NULL;

-- 验证更新结果
SELECT id, report_number, base_name, route_name, date
FROM logs
ORDER BY date DESC
LIMIT 10;
