import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  console.log('开始设置数据库...');

  // 1. 尝试创建 pg_execute 函数
  console.log('\n1. 创建 pg_execute 函数...');
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION pg_execute(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  try {
    // 使用 REST API 直接执行
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: createFunctionSQL })
    });

    if (!response.ok) {
      console.log('  execute_sql RPC 不存在，尝试其他方法...');
    } else {
      console.log('  pg_execute 函数创建成功');
    }
  } catch (e) {
    console.log('  调用失败:', e.message);
  }

  // 2. 尝试直接插入数据来触发表创建（利用错误信息判断表是否存在）
  console.log('\n2. 检查并创建 roles 表...');

  const testData = {
    id: 'test-' + Date.now(),
    name: '测试角色',
    code: 'test-role-' + Date.now(),
    description: '测试用，创建后会删除',
    permissions: ['test'],
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('roles')
      .insert([testData]);

    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log('  roles 表不存在，需要创建');
        console.log('\n  ⚠️  无法自动创建表，需要手动执行 SQL');
        console.log('  请在 Supabase Dashboard 中执行以下 SQL：\n');
        console.log('  --- COPY BELOW ---');
        console.log(`
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

INSERT INTO roles (id, name, code, description, permissions, created_at) VALUES
  ('1', '管理员', 'admin', '系统管理员，拥有所有权限', ARRAY['all'], NOW()),
  ('2', '普通用户', 'user', '普通用户，可进行日常操作', ARRAY['logs:read', 'logs:create', 'analysis:read'], NOW()),
  ('3', '查看者', 'viewer', '仅可查看数据，无法修改', ARRAY['logs:read', 'analysis:read'], NOW())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
        `);
        console.log('  --- COPY ABOVE ---\n');
        return false;
      } else {
        console.log('  表已存在，但插入测试数据失败:', error.message);
        return true; // 表存在
      }
    } else {
      console.log('  表已存在且可以写入数据');
      // 删除测试数据
      await supabase.from('roles').delete().eq('id', testData.id);
      return true;
    }
  } catch (e) {
    console.error('  检查表时出错:', e.message);
    return false;
  }
}

// 备用方案：使用 PostgreSQL 直接连接
async function setupViaPostgres() {
  console.log('\n尝试使用 PostgreSQL 直接连接...');
  console.log('这需要安装 pg 模块，运行: npm install pg');
  console.log('或者运行: npx setup-roles-db');
}

async function main() {
  const exists = await setupDatabase();

  if (!exists) {
    console.log('\n❌ roles 表不存在，请使用以下方法之一创建：');
    console.log('\n方法1：安装 pg 模块后执行 SQL');
    console.log('  npm install pg');
    console.log('  node scripts/setup-roles-db-pg.mjs');
    console.log('\n方法2：使用 npx 运行一次性脚本');
    console.log('  npx -y pg@latest node scripts/setup-roles-db-pg.mjs');
    console.log('\n方法3：在 Supabase Dashboard 中手动执行 SQL');
    console.log('  访问: https://app.supabase.com/project/qamqyjpbdtoylwnxhrfm/editor');
    process.exit(1);
  } else {
    console.log('\n✅ roles 表已就绪');
    process.exit(0);
  }
}

main();
