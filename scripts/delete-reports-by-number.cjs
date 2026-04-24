// 根据报告编号删除日志数据
// 使用: node scripts/delete-reports-by-number.js FXBG-20260423-351 FXBG-20260422-956

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // 需要服务密钥

// 要删除的报告编号
const reportNumbers = process.argv.slice(2);

if (reportNumbers.length === 0) {
  console.error('请提供要删除的报告编号，例如: node delete-reports-by-number.js FXBG-20260423-351');
  process.exit(1);
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('错误: 请设置 SUPABASE_SERVICE_KEY 环境变量');
    console.log('使用: SUPABASE_SERVICE_KEY=xxx node scripts/delete-reports-by-number.js <报告编号>');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  for (const reportNumber of reportNumbers) {
    console.log(`\n正在处理报告编号: ${reportNumber}`);

    // 1. 先查找记录
    const { data: records, error: findError } = await supabase
      .from('logs')
      .select('id, report_number, date, created_at')
      .eq('report_number', reportNumber);

    if (findError) {
      console.error(`  查找失败: ${findError.message}`);
      continue;
    }

    if (!records || records.length === 0) {
      console.log(`  未找到该编号的记录`);
      continue;
    }

    console.log(`  找到 ${records.length} 条记录`);

    // 显示记录详情
    for (const record of records) {
      console.log(`    - ID: ${record.id}, 日期: ${record.date}, 创建时间: ${record.created_at}`);
    }

    // 2. 删除关联的审核历史
    for (const record of records) {
      const { error: reviewError } = await supabase
        .from('report_reviews')
        .delete()
        .eq('report_id', record.id);

      if (reviewError) {
        console.error(`    删除审核历史失败: ${reviewError.message}`);
      } else {
        console.log(`    已删除关联的审核历史`);
      }
    }

    // 3. 删除记录
    const { error: deleteError } = await supabase
      .from('logs')
      .delete()
      .eq('report_number', reportNumber);

    if (deleteError) {
      console.error(`  删除失败: ${deleteError.message}`);
    } else {
      console.log(`  成功删除 ${records.length} 条记录`);
    }
  }

  console.log('\n完成');
}

main().catch(console.error);
