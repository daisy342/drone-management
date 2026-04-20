import { createClient } from '@supabase/supabase-js';

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  console.log('开始设置数据库...');

  try {
    // 1. 创建profiles表
    console.log('\n1. 创建profiles表...');
    const { error: createTableError } = await supabase.rpc('create_profiles_table');
    if (createTableError && !createTableError.message.includes('already exists')) {
      console.error('创建表失败:', createTableError);
    } else {
      console.log('profiles表已存在或创建成功');
    }

    // 2. 创建handle_new_user函数
    console.log('\n2. 创建handle_new_user函数...');
    const { error: funcError } = await supabase.rpc('create_handle_new_user_function');
    if (funcError) {
      console.error('创建函数失败:', funcError);
    } else {
      console.log('函数创建成功');
    }

    // 3. 创建触发器
    console.log('\n3. 创建触发器...');
    const { error: triggerError } = await supabase.rpc('create_auth_trigger');
    if (triggerError) {
      console.error('创建触发器失败:', triggerError);
    } else {
      console.log('触发器创建成功');
    }

    // 4. 启用RLS
    console.log('\n4. 启用RLS...');
    const tables = ['logs', 'bases', 'routes', 'areas', 'profiles'];
    for (const table of tables) {
      const { error } = await supabase.rpc('enable_rls', { table_name: table });
      if (error && !error.message.includes('already enabled')) {
        console.error(`启用${table} RLS失败:`, error);
      } else {
        console.log(`${table} RLS已启用`);
      }
    }

    // 5. 创建策略
    console.log('\n5. 创建策略...');
    const policies = [
      { table: 'logs', name: 'Users can view logs', action: 'SELECT', using: 'true' },
      { table: 'logs', name: 'Users can insert logs', action: 'INSERT', check: 'true' },
      { table: 'logs', name: 'Users can update logs', action: 'UPDATE', using: 'true' },
      { table: 'logs', name: 'Users can delete logs', action: 'DELETE', using: 'true' },
      { table: 'bases', name: 'Users can view bases', action: 'SELECT', using: 'true' },
      { table: 'bases', name: 'Users can insert bases', action: 'INSERT', check: 'true' },
      { table: 'bases', name: 'Users can update bases', action: 'UPDATE', using: 'true' },
      { table: 'bases', name: 'Users can delete bases', action: 'DELETE', using: 'true' },
      { table: 'routes', name: 'Users can view routes', action: 'SELECT', using: 'true' },
      { table: 'routes', name: 'Users can insert routes', action: 'INSERT', check: 'true' },
      { table: 'routes', name: 'Users can update routes', action: 'UPDATE', using: 'true' },
      { table: 'routes', name: 'Users can delete routes', action: 'DELETE', using: 'true' },
      { table: 'areas', name: 'Users can view areas', action: 'SELECT', using: 'true' },
      { table: 'areas', name: 'Users can insert areas', action: 'INSERT', check: 'true' },
      { table: 'areas', name: 'Users can update areas', action: 'UPDATE', using: 'true' },
      { table: 'areas', name: 'Users can delete areas', action: 'DELETE', using: 'true' },
      { table: 'profiles', name: 'Users can view own profile', action: 'SELECT', using: 'auth.uid() = id' },
      { table: 'profiles', name: 'Users can update own profile', action: 'UPDATE', using: 'auth.uid() = id' },
      { table: 'profiles', name: 'Users can insert own profile', action: 'INSERT', check: 'auth.uid() = id' },
      { table: 'profiles', name: 'Admins can view all profiles', action: 'SELECT', using: 'true' },
      { table: 'profiles', name: 'Admins can update all profiles', action: 'UPDATE', using: 'true' },
      { table: 'profiles', name: 'Admins can delete all profiles', action: 'DELETE', using: 'true' },
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('create_policy', {
        policy_name: policy.name,
        table_name: policy.table,
        action: policy.action,
        using_expr: policy.using || null,
        check_expr: policy.check || null
      });
      if (error && !error.message.includes('already exists')) {
        console.error(`创建策略 ${policy.name} 失败:`, error);
      } else {
        console.log(`策略 ${policy.name} 已存在或创建成功`);
      }
    }

    console.log('\n数据库设置完成！');
  } catch (error) {
    console.error('设置数据库时出错:', error);
  }
}

setupDatabase();
