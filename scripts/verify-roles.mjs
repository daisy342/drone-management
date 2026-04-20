import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyRolesTable() {
  console.log('验证 roles 表...\n');

  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 查询失败:', error.message);
      return;
    }

    console.log('✅ roles 表已创建成功！');
    console.log(`\n共有 ${data.length} 个角色:\n`);

    data.forEach((role, index) => {
      console.log(`${index + 1}. ${role.name} (${role.code})`);
      console.log(`   描述: ${role.description}`);
      console.log(`   权限: ${role.permissions?.join(', ') || '无'}`);
      console.log(`   ID: ${role.id}`);
      console.log('');
    });

  } catch (e) {
    console.error('❌ 验证失败:', e.message);
  }
}

verifyRolesTable();
