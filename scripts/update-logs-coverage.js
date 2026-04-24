import { createClient } from '@supabase/supabase-js';

// 使用 Service Role Key 以便执行数据更新
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

async function updateLogsCoverageArea() {
  try {
    // 1. 查询所有可用的覆盖范围
    const { data: coverageAreas, error: dictError } = await supabase
      .from('dictionary')
      .select('id, name, code')
      .eq('type', 'coverage_area')
      .eq('is_active', true);

    if (dictError) {
      throw new Error(`查询字典失败: ${dictError.message}`);
    }

    if (!coverageAreas || coverageAreas.length === 0) {
      console.log('没有找到覆盖范围数据，请先添加数据字典');
      return;
    }

    console.log(`找到 ${coverageAreas.length} 个覆盖范围：`);
    coverageAreas.forEach(area => {
      console.log(`  - ${area.code}: ${area.name}`);
    });

    // 2. 查询需要更新的日志
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('id')
      .is('coverage_area_id', null);

    if (logsError) {
      throw new Error(`查询日志失败: ${logsError.message}`);
    }

    if (!logs || logs.length === 0) {
      console.log('没有需要更新的日志记录');
      return;
    }

    console.log(`\n需要更新 ${logs.length} 条日志记录`);

    // 3. 批量更新每条日志，随机分配覆盖范围
    let successCount = 0;
    let failCount = 0;

    for (const log of logs) {
      // 随机选择一个覆盖范围
      const randomArea = coverageAreas[Math.floor(Math.random() * coverageAreas.length)];

      const { error: updateError } = await supabase
        .from('logs')
        .update({
          coverage_area_id: randomArea.id,
          coverage_area_name: randomArea.name
        })
        .eq('id', log.id);

      if (updateError) {
        console.error(`更新日志 ${log.id} 失败: ${updateError.message}`);
        failCount++;
      } else {
        successCount++;
      }

      // 每 10 条显示进度
      if ((successCount + failCount) % 10 === 0) {
        console.log(`  进度: ${successCount + failCount}/${logs.length}`);
      }
    }

    console.log(`\n更新完成！成功: ${successCount}, 失败: ${failCount}`);

    // 4. 验证更新结果
    const { data: verifyData, error: verifyError } = await supabase
      .from('logs')
      .select('id, date, coverage_area_id, coverage_area_name')
      .not('coverage_area_id', 'is', null)
      .limit(10);

    if (verifyError) {
      console.error(`验证失败: ${verifyError.message}`);
      return;
    }

    console.log('\n更新后的样本数据：');
    verifyData?.forEach(log => {
      console.log(`  - ${log.date}: ${log.coverage_area_name}`);
    });

  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

updateLogsCoverageArea();
