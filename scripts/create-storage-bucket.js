// 使用 Supabase Management API 执行 SQL - 创建存储桶
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase 项目配置
const PROJECT_REF = 'qamqyjpbdtoylwnxhrfm';
const ACCESS_TOKEN = 'sbp_a0bc41522f84a99d5062d7d9a5b08fd77c05e4ce';

// 读取 SQL 文件
const sqlFile = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260423000001_create_storage_bucket.sql'),
  'utf8'
);

async function executeSql() {
  console.log('正在创建存储桶 log-photos...\n');

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sqlFile }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('执行失败:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log('存储桶创建成功!');
    console.log('结果:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('请求失败:', err.message);
    process.exit(1);
  }
}

executeSql();
