const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSQL() {
  console.log('开始执行SQL脚本...');

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_database.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('SQL文件读取成功');
    console.log('SQL内容预览（前500字符）:');
    console.log(sqlContent.substring(0, 500));

    // 使用Supabase的rpc执行SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: sqlContent
    });

    if (error) {
      console.error('执行SQL时出错:', error);

      // 如果exec_sql不存在，尝试分段执行
      if (error.message && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n尝试使用REST API直接执行...');
        await runSQLViaREST(sqlContent);
      }
    } else {
      console.log('SQL脚本执行成功！');
    }
  } catch (error) {
    console.error('发生错误:', error);
  }
}

async function runSQLViaREST(sql) {
  try {
    // 分割SQL语句并逐条执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`共解析出 ${statements.length} 条SQL语句`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`\n执行第 ${i + 1}/${statements.length} 条语句...`);
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));

      // 使用pg_execute函数执行SQL
      const { data, error } = await supabase.rpc('pg_execute', {
        sql: stmt
      });

      if (error) {
        // 尝试使用pgSQL
        const { error: error2 } = await supabase.rpc('pgSQL', {
          query: stmt
        });

        if (error2) {
          console.error(`  执行失败:`, error2.message);
          // 继续执行下一条
        } else {
          console.log(`  执行成功`);
        }
      } else {
        console.log(`  执行成功`);
      }
    }

    console.log('\n所有SQL语句执行完成！');
  } catch (error) {
    console.error('REST执行出错:', error);
  }
}

runSQL();
