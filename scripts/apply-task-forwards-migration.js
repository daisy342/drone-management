// 通过 Supabase REST API 执行 SQL 迁移
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

async function runMigration() {
  console.log('开始执行 task_forwards 表迁移...');

  // 读取SQL文件
  const sqlFile = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20260423000000_create_task_forwards.sql'),
    'utf8'
  );

  // 按分号分割SQL语句，但要处理函数体
  const statements = splitSqlStatements(sqlFile);

  console.log(`共有 ${statements.length} 条 SQL 语句需要执行`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement.trim()) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // 忽略已存在的错误
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('Multiple declarations')) {
          console.log(`[${i+1}/${statements.length}] 跳过 (已存在)`);
        } else {
          console.error(`[${i+1}/${statements.length}] 执行失败:`);
          console.error(`  SQL: ${statement.substring(0, 100)}...`);
          console.error(`  错误: ${error.message}`);
        }
      } else {
        console.log(`[${i+1}/${statements.length}] 成功`);
      }
    } catch (err) {
      console.error(`[${i+1}/${statements.length}] 错误: ${err.message}`);
    }
  }

  console.log('\n迁移完成！');
}

// 智能分割SQL语句，处理函数体
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let functionDepth = 0;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过注释和空行
    if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.startsWith('*') || !trimmed) {
      continue;
    }

    // 检测函数开始
    if (trimmed.includes('CREATE OR REPLACE FUNCTION') ||
        trimmed.includes('CREATE FUNCTION')) {
      inFunction = true;
      functionDepth = 0;
    }

    // 在函数体内追踪深度
    if (inFunction) {
      if (trimmed.includes('BEGIN') || trimmed.includes('THEN') || trimmed.includes('LOOP')) {
        functionDepth++;
      }
      if (trimmed.includes('END') && !trimmed.includes('END;')) {
        functionDepth--;
      }
      if (trimmed === 'END;' || trimmed === '$$ LANGUAGE plpgsql') {
        inFunction = false;
      }
    }

    current += line + '\n';

    // 只在函数体外按分号分割
    if (!inFunction && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // 添加最后一条语句
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s.length > 0);
}

runMigration().catch(console.error);
