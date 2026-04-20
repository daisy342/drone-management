import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('SQL内容长度:', sqlContent.length, '字符');

    // 使用Supabase Management API直接执行SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: sqlContent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('执行失败:', errorText);

      // 尝试通过pg_execute
      await tryPgExecute(sqlContent);
    } else {
      const result = await response.json();
      console.log('执行成功:', result);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }
}

async function tryPgExecute(sql) {
  console.log('\n尝试通过pg_execute执行...');

  // 分割SQL语句
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`共解析出 ${statements.length} 条SQL语句`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    console.log(`\n[${i + 1}/${statements.length}] 执行: ${stmt.substring(0, 80)}...`);

    try {
      const { data, error } = await supabase.rpc('pg_execute', { sql: stmt });

      if (error) {
        console.error('  失败:', error.message);
      } else {
        console.log('  成功');
      }
    } catch (e) {
      console.error('  异常:', e.message);
    }
  }
}

runSQL();
