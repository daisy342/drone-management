import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('请设置 VITE_SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkLogs() {
  // 查询所有日志，包括巡查区域字段
  const { data: logs, error } = await supabase
    .from('logs')
    .select('id, date, area_id, coverage_area_id, coverage_area_name, province_name, city_name, district_name')
    .order('date', { ascending: false });

  if (error) {
    console.error('查询失败:', error.message);
    return;
  }

  console.log(`总共有 ${logs?.length || 0} 条日志记录:\n`);
  console.log('ID | 日期 | area_id | coverage_area_id | coverage_area_name | 省市区');
  console.log('---|------|---------|------------------|--------------------|-------');

  logs?.forEach(log => {
    const location = `${log.province_name || ''}/${log.city_name || ''}/${log.district_name || ''}`;
    console.log(`${log.id.substring(0, 8)}... | ${log.date} | ${log.area_id || '-'} | ${log.coverage_area_id ? log.coverage_area_id.substring(0, 8) + '...' : 'NULL'} | ${log.coverage_area_name || 'NULL'} | ${location}`);
  });

  // 统计有多少条已经更新了 coverage_area
  const withCoverage = logs?.filter(l => l.coverage_area_id).length || 0;
  const withoutCoverage = (logs?.length || 0) - withCoverage;

  console.log(`\n统计: 已更新 ${withCoverage} 条, 未更新 ${withoutCoverage} 条`);
}

checkLogs();
