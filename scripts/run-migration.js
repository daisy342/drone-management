const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('开始执行数据库迁移...');

  // 读取SQL文件
  const fs = require('fs');
  const path = require('path');
  const sqlFile = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20260422140000_unified_logs_enhancement.sql'),
    'utf8'
  );

  // 分割SQL语句（简单按分号分割）
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        // 忽略已存在的错误
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`跳过: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`执行失败: ${statement.substring(0, 50)}...`);
          console.error(`错误: ${error.message}`);
        }
      } else {
        console.log(`成功: ${statement.substring(0, 50)}...`);
      }
    } catch (err: any) {
      console.error(`错误: ${err.message}`);
    }
  }

  console.log('迁移完成！');
}

runMigration().catch(console.error);
