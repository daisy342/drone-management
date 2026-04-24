// 通过 Supabase Management API 或直接执行 SQL 迁移
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const supabaseServiceKey = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 读取SQL文件
const sqlFile = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260423000000_create_task_forwards.sql'),
  'utf8'
);

async function applyMigration() {
  console.log('开始执行 task_forwards 表迁移...');
  console.log('注意: Supabase JS 客户端无法直接执行原始 SQL，需要使用 Supabase CLI 或 Management API');
  console.log('\n以下是迁移 SQL 文件路径:');
  console.log('supabase/migrations/20260423000000_create_task_forwards.sql');
  console.log('\n请使用以下命令执行迁移:');
  console.log('\n方法1: 使用 Supabase CLI (推荐)');
  console.log('  supabase db push');
  console.log('\n方法2: 使用 Management API');
  console.log('  需要访问 https://supabase.com/dashboard/project/qamqyjpbdtoylwnxhrfm');
  console.log('  在 SQL Editor 中执行上述文件内容');
  console.log('\n方法3: 在 Supabase Dashboard 中手动执行');
  console.log('  1. 访问 https://supabase.com/dashboard/project/qamqyjpbdtoylwnxhrfm/sql');
  console.log('  2. 新建查询');
  console.log('  3. 粘贴以下 SQL:');
  console.log('\n--- SQL 开始 ---');
  console.log(sqlFile);
  console.log('--- SQL 结束 ---');
}

applyMigration();
