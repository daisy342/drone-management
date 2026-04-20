const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('开始检查数据库表...\n');

  const tables = ['profiles', 'logs', 'bases', 'routes', 'areas'];

  for (const table of tables) {
    console.log(`检查表: ${table}`);
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`  ❌ 表 ${table} 存在问题:`, error.message);

        // 检查是否是RLS策略问题
        if (error.message.includes('row-level security')) {
          console.log(`  ⚠️  需要添加RLS策略`);
        }
      } else {
        console.log(`  ✅ 表 ${table} 存在且可访问`);
        console.log(`  📊 数据示例:`, data);
      }
    } catch (err) {
      console.error(`  ❌ 检查表 ${table} 时出错:`, err.message);
    }
    console.log('');
  }

  // 检查RLS策略
  console.log('检查RLS策略...\n');
  try {
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies');

    if (policyError) {
      console.log('  ⚠️  无法获取策略信息（需要手动检查）');
    } else {
      console.log('  现有策略:', policies);
    }
  } catch (err) {
    console.log('  ⚠️  无法自动检查策略');
  }
}

async function createRLSPolicies() {
  console.log('\n尝试创建RLS策略...\n');

  // 使用原始SQL查询来创建策略
  const policies = [
    {
      table: 'logs',
      sql: `
        ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Users can view logs" ON logs FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert logs" ON logs FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Users can update logs" ON logs FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Users can delete logs" ON logs FOR DELETE USING (true);
      `
    },
    {
      table: 'bases',
      sql: `
        ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Users can view bases" ON bases FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert bases" ON bases FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Users can update bases" ON bases FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Users can delete bases" ON bases FOR DELETE USING (true);
      `
    },
    {
      table: 'routes',
      sql: `
        ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Users can view routes" ON routes FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert routes" ON routes FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Users can update routes" ON routes FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Users can delete routes" ON routes FOR DELETE USING (true);
      `
    },
    {
      table: 'areas',
      sql: `
        ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Users can view areas" ON areas FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert areas" ON areas FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Users can update areas" ON areas FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Users can delete areas" ON areas FOR DELETE USING (true);
      `
    },
    {
      table: 'profiles',
      sql: `
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
      `
    }
  ];

  for (const { table, sql } of policies) {
    console.log(`为 ${table} 表创建策略...`);
    try {
      // 尝试通过REST API直接执行SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          query: sql
        })
      });

      if (response.ok) {
        console.log(`  ✅ ${table} 表策略创建成功`);
      } else {
        const errorText = await response.text();
        console.log(`  ⚠️  ${table} 表策略创建失败:`, errorText);
        console.log(`  📝 请手动在Supabase仪表板中执行以下SQL:`);
        console.log(sql);
      }
    } catch (err) {
      console.log(`  ⚠️  ${table} 表策略创建失败:`, err.message);
      console.log(`  📝 请手动在Supabase仪表板中执行以下SQL:`);
      console.log(sql);
    }
    console.log('');
  }
}

async function main() {
  console.log('========================================');
  console.log('  数据库表检查和RLS策略设置工具');
  console.log('========================================\n');

  await checkTables();
  await createRLSPolicies();

  console.log('\n========================================');
  console.log('  检查完成！');
  console.log('========================================');
  console.log('\n如果某些策略创建失败，请手动在Supabase仪表板中执行SQL。');
  console.log('访问: https://supabase.com/dashboard/project/qamqyjpbdtoylwnxhrfm/sql');
}

main().catch(console.error);