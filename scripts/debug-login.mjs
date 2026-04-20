import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugLogin() {
  console.log('=== 登录调试信息 ===\n');

  // 1. 查询 profiles 表
  console.log('1. Profiles 表中的用户:');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('查询 profiles 失败:', profileError);
    return;
  }

  profiles.forEach(p => {
    console.log(`   用户名: ${p.username}`);
    console.log(`   邮箱: ${p.email}`);
    console.log(`   ID: ${p.id}`);
    console.log('');
  });

  // 2. 查询 auth.users
  console.log('2. Auth 用户列表:');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('查询 auth.users 失败:', authError.message);
  } else {
    authUsers.users.forEach(u => {
      console.log(`   邮箱: ${u.email}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   已确认: ${u.email_confirmed_at ? '是' : '否'}`);
      console.log(`   有密码: ${u.encrypted_password ? '是' : '否'}`);
      console.log('');
    });
  }

  // 3. 检查张三的信息
  console.log('3. 查找用户 "张三":');
  const zhangsan = profiles.find(p => p.username === '张三');
  if (zhangsan) {
    console.log(`   找到用户: ${zhangsan.username}`);
    console.log(`   邮箱: ${zhangsan.email}`);
    console.log(`   ID: ${zhangsan.id}`);

    // 检查对应的 auth 用户
    const authUser = authUsers?.users.find(u => u.id === zhangsan.id);
    if (authUser) {
      console.log(`   Auth 用户存在: 是`);
      console.log(`   密码已设置: ${authUser.encrypted_password ? '是' : '否'}`);
    } else {
      console.log(`   Auth 用户存在: 否 (这可能是问题所在!)`);
    }
  } else {
    console.log('   未找到用户 "张三"');
  }

  // 4. 尝试直接登录
  console.log('\n4. 尝试用邮箱 __@example.com 登录:');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: '__@example.com',
    password: '123456'
  });

  if (loginError) {
    console.log(`   登录失败: ${loginError.message}`);
  } else {
    console.log(`   登录成功!`);
  }
}

debugLogin();
