import { createClient } from '@supabase/supabase-js';

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  console.log('测试数据库连接...');

  try {
    // 测试查询logs表
    console.log('\n1. 测试查询logs表...');
    const { data: logsData, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .limit(1);

    if (logsError) {
      console.error('logs表查询失败:', logsError);
    } else {
      console.log('logs表查询成功，数据:', logsData);
    }

    // 测试查询profiles表
    console.log('\n2. 测试查询profiles表...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('profiles表查询失败:', profilesError);
    } else {
      console.log('profiles表查询成功，数据:', profilesData);
    }

    // 测试查询bases表
    console.log('\n3. 测试查询bases表...');
    const { data: basesData, error: basesError } = await supabase
      .from('bases')
      .select('*')
      .limit(1);

    if (basesError) {
      console.error('bases表查询失败:', basesError);
    } else {
      console.log('bases表查询成功，数据:', basesData);
    }

    // 测试查询routes表
    console.log('\n4. 测试查询routes表...');
    const { data: routesData, error: routesError } = await supabase
      .from('routes')
      .select('*')
      .limit(1);

    if (routesError) {
      console.error('routes表查询失败:', routesError);
    } else {
      console.log('routes表查询成功，数据:', routesData);
    }

    // 测试查询areas表
    console.log('\n5. 测试查询areas表...');
    const { data: areasData, error: areasError } = await supabase
      .from('areas')
      .select('*')
      .limit(1);

    if (areasError) {
      console.error('areas表查询失败:', areasError);
    } else {
      console.log('areas表查询成功，数据:', areasData);
    }

  } catch (error) {
    console.error('测试出错:', error);
  }
}

testConnection();
