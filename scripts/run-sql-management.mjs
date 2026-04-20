import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

// 使用Management API
const MANAGEMENT_API_URL = 'https://api.supabase.com/v1';
// 注意：需要使用个人访问令牌，而不是服务角色密钥
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runSQLWithManagementAPI() {
  console.log('尝试使用Management API执行SQL...');

  if (!ACCESS_TOKEN) {
    console.error('错误: 未设置SUPABASE_ACCESS_TOKEN环境变量');
    console.log('\n请先生成个人访问令牌：');
    console.log('1. 访问 https://supabase.com/dashboard/account/tokens');
    console.log('2. 点击 "New Token"');
    console.log('3. 设置令牌名称并复制令牌值');
    console.log('4. 运行: export SUPABASE_ACCESS_TOKEN=你的令牌');
    return;
  }

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_database.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('SQL文件读取成功');

    // 使用Management API执行SQL
    const response = await fetch(`${MANAGEMENT_API_URL}/projects/qamqyjpbdtoylwnxhrfm/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({ query: sqlContent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('执行失败:', errorText);
    } else {
      const result = await response.json();
      console.log('执行成功:', result);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }
}

runSQLWithManagementAPI();
