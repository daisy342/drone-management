import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUserRole() {
  // 查询所有用户及其角色
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, email, role');

  if (error) {
    console.error('查询失败:', error);
    return;
  }

  console.log('用户列表及角色:\n');
  profiles.forEach(p => {
    console.log(`  用户名: ${p.username}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  角色: ${p.role}`);
    console.log(`  邮箱: ${p.email}`);
    console.log('');
  });

  // 检查是否有 admin 角色的用户
  const admins = profiles.filter(p => p.role === 'admin');
  console.log(`\n共有 ${admins.length} 个管理员:`);
  admins.forEach(a => console.log(`  - ${a.username}`));
}

checkUserRole();
