import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nL04j1RW_28LJF1wKwsfAw_xmVlgum4';

// 使用 anon key 创建客户端（模拟前端环境）
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLoginFlow() {
  console.log('=== 测试前端登录流程 ===\n');

  const username = '张三';
  const password = '123456';

  console.log('1. 输入用户名:', username);

  // 步骤1: 查询 profiles 表获取邮箱
  console.log('\n2. 查询 profiles 表...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('email, username')
    .eq('username', username)
    .single();

  console.log('   查询结果:', { profileData, profileError });

  if (profileError || !profileData) {
    console.error('   未找到用户:', profileError);
    return;
  }

  const email = profileData.email;
  console.log('   找到邮箱:', email);

  // 步骤2: 尝试登录
  console.log('\n3. 尝试用邮箱登录:', email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  console.log('   登录结果:', { data, error });

  if (error) {
    console.error('   登录失败:', error.message);

    // 检查密码是否正确
    console.log('\n4. 检查密码是否正确...');
    console.log('   可能需要重新设置密码');
  } else {
    console.log('   登录成功!');
  }
}

testLoginFlow();
