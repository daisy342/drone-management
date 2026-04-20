import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testUpdateRole() {
  console.log('测试更新角色...\n');

  // 1. 先获取所有角色
  const { data: roles, error: fetchError } = await supabase
    .from('roles')
    .select('*');

  if (fetchError) {
    console.error('获取角色失败:', fetchError);
    return;
  }

  console.log('当前角色列表:');
  roles.forEach(role => {
    console.log(`  ID: ${role.id}, Name: ${role.name}, Code: ${role.code}`);
  });

  // 2. 尝试更新第一个角色
  if (roles.length > 0) {
    const firstRole = roles[0];
    console.log(`\n尝试更新角色: ${firstRole.id}`);

    const { data, error } = await supabase
      .from('roles')
      .update({ name: firstRole.name + '_test', updated_at: new Date().toISOString() })
      .eq('id', firstRole.id)
      .select();

    if (error) {
      console.error('更新失败:', error);
    } else {
      console.log('更新成功:', data);
    }
  }
}

testUpdateRole();
