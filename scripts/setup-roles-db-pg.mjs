import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:OOnzTyny54jUruyl@db.qamqyjpbdtoylwnxhrfm.supabase.co:5432/postgres';

const sql = `
-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为角色表创建索引
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- 插入默认角色数据
INSERT INTO roles (id, name, code, description, permissions, created_at) VALUES
  ('1', '管理员', 'admin', '系统管理员，拥有所有权限', ARRAY['all'], NOW()),
  ('2', '普通用户', 'user', '普通用户，可进行日常操作', ARRAY['logs:read', 'logs:create', 'analysis:read'], NOW()),
  ('3', '查看者', 'viewer', '仅可查看数据，无法修改', ARRAY['logs:read', 'analysis:read'], NOW())
ON CONFLICT (id) DO NOTHING;

-- 启用 Row Level Security (RLS)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许所有已认证用户查看角色
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 创建策略，允许管理员管理角色
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 创建 updated_at 自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：自动更新 roles 表的 updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function setupRolesTable() {
  console.log('正在使用 PostgreSQL 直接连接创建 roles 表...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 分割 SQL 语句并执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`共 ${statements.length} 条 SQL 语句需要执行\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ').trim();
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

      try {
        await client.query(stmt);
        console.log('✓');
      } catch (err) {
        // 忽略已存在的错误
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate key') ||
            err.message.includes('Duplicate')) {
          console.log('已存在');
        } else {
          console.log('✗');
          console.error('  错误:', err.message);
        }
      }
    }

    // 验证表是否创建成功
    console.log('\n验证 roles 表...');
    const result = await client.query('SELECT COUNT(*) FROM roles');
    console.log(`✅ roles 表创建成功，共有 ${result.rows[0].count} 条记录`);

    const roles = await client.query('SELECT id, name, code FROM roles');
    console.log('\n角色列表:');
    roles.rows.forEach(role => {
      console.log(`  - ${role.name} (${role.code})`);
    });

  } catch (error) {
    console.error('\n❌ 连接或执行失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupRolesTable();
