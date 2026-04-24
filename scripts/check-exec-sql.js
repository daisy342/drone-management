// 检查 exec_sql 函数是否存在
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const supabaseServiceKey = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkExecSql() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (error) {
      console.log('exec_sql 函数不存在:', error.message);
      process.exit(1);
    } else {
      console.log('exec_sql 函数存在');
      process.exit(0);
    }
  } catch (err) {
    console.error('检查失败:', err.message);
    process.exit(1);
  }
}

checkExecSql();
