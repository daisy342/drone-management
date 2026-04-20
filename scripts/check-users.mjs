import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUser() {
  // 查询 profiles 表
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('查询 profiles 失败:', profileError);
    return;
  }

  console.log('Profiles 表中的用户:\n');
  profiles.forEach(p => {
    console.log(`  用户名: ${p.username}`);
    console.log(`  Email: ${p.email}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  角色: ${p.role}`);
    console.log('');
  });

  // 查询 auth.users（通过 admin API）
  console.log('\n尝试查询 auth.users...');
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('查询 auth.users 失败:', authError.message);
  } else {
    console.log('\nAuth 用户列表:');
    users.users.forEach(u => {
      console.log(`  Email: ${u.email}`);
      console.log(`  ID: ${u.id}`);
      console.log(`  已确认: ${u.email_confirmed_at ? '是' : '否'}`);
      console.log('');
    });
  }
}

checkUser();
