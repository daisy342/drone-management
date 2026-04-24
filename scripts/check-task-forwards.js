// 检查 task_forwards 表是否存在
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const supabaseKey = 'sb_publishable_nL04j1RW_28LJF1wKwsfAw_xmVlgum4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    // 尝试查询表结构
    const { data, error } = await supabase
      .from('task_forwards')
      .select('*')
      .limit(1);

    if (error) {
      console.log('表不存在或无法访问:', error.message);
      process.exit(1);
    } else {
      console.log('task_forwards 表已存在');
      console.log('数据示例:', data);
      process.exit(0);
    }
  } catch (err) {
    console.error('检查失败:', err.message);
    process.exit(1);
  }
}

checkTable();
