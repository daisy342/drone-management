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

async function createRolesTable() {
  console.log('开始创建 roles 表...');

  try {
    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260417172436_create_roles_table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('SQL 文件读取成功');
    console.log('SQL 内容长度:', sqlContent.length, '字符');

    // 分割 SQL 语句并逐条执行
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`共解析出 ${statements.length} 条 SQL 语句`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] 执行: ${stmt.substring(0, 80)}...`);

      try {
        // 使用 pg_execute 函数执行 SQL
        const { data, error } = await supabase.rpc('pg_execute', { sql: stmt });

        if (error) {
          // 忽略已存在的错误
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('  已存在，跳过');
          } else {
            console.error('  失败:', error.message);
          }
        } else {
          console.log('  成功');
        }
      } catch (e) {
        // 忽略已存在的错误
        if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
          console.log('  已存在，跳过');
        } else {
          console.error('  异常:', e.message);
        }
      }
    }

    console.log('\nroles 表创建完成！');

    // 验证表是否创建成功
    console.log('\n验证表是否存在...');
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('验证失败:', error.message);
    } else {
      console.log('roles 表验证成功！');
    }

  } catch (error) {
    console.error('发生错误:', error.message);
  }
}

// 备选方案：使用 Supabase Management API 的 pg 接口
async function createRolesTableViaAPI() {
  console.log('尝试通过 Supabase Management API 创建 roles 表...');

  try {
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260417172436_create_roles_table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // 尝试使用 REST API 直接执行 SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql: sqlContent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 调用失败:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('执行成功:', result);
    return true;

  } catch (error) {
    console.error('API 调用异常:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  // 先尝试 RPC 方式
  await createRolesTable();

  // 验证表是否创建
  console.log('\n验证 roles 表...');
  const { data, error } = await supabase
    .from('roles')
    .select('*');

  if (error) {
    console.error('roles 表不存在或无法访问:', error.message);
    console.log('\n请手动在 Supabase Dashboard 中执行 SQL 文件:');
    console.log('1. 打开 Supabase Dashboard: https://app.supabase.com');
    console.log('2. 进入 SQL Editor');
    console.log('3. 复制并执行 supabase/migrations/20260417172436_create_roles_table.sql 的内容');
  } else {
    console.log('roles 表已就绪，当前数据:', data?.length || 0, '条记录');
  }
}

main();
