const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const SUPABASE_URL = 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_sC6xgxQ24-NnnJAvZBqgGA_vjU2xJaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  console.log('开始设置数据库...');

  try {
    // 为logs表添加策略
    console.log('设置logs表策略...');
    const { error: logsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view own logs" ON logs FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert logs" ON logs FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Users can update own logs" ON logs FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Users can delete own logs" ON logs FOR DELETE USING (true);
      `
    });
    if (logsError) console.error('logs策略错误:', logsError);
    else console.log('logs表策略设置完成');

    // 为bases表添加策略
    console.log('设置bases表策略...');
    const { error: basesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view bases" ON bases FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert bases" ON bases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can update bases" ON bases FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can delete bases" ON bases FOR DELETE USING (auth.role() = 'authenticated');
      `
    });
    if (basesError) console.error('bases策略错误:', basesError);
    else console.log('bases表策略设置完成');

    // 为routes表添加策略
    console.log('设置routes表策略...');
    const { error: routesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view routes" ON routes FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert routes" ON routes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can update routes" ON routes FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can delete routes" ON routes FOR DELETE USING (auth.role() = 'authenticated');
      `
    });
    if (routesError) console.error('routes策略错误:', routesError);
    else console.log('routes表策略设置完成');

    // 为areas表添加策略
    console.log('设置areas表策略...');
    const { error: areasError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view areas" ON areas FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Users can insert areas" ON areas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can update areas" ON areas FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY IF NOT EXISTS "Users can delete areas" ON areas FOR DELETE USING (auth.role() = 'authenticated');
      `
    });
    if (areasError) console.error('areas策略错误:', areasError);
    else console.log('areas表策略设置完成');

    // 为profiles表添加策略
    console.log('设置profiles表策略...');
    const { error: profilesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
        CREATE POLICY IF NOT EXISTS "Users can view all profiles" ON profiles FOR SELECT USING (true);
      `
    });
    if (profilesError) console.error('profiles策略错误:', profilesError);
    else console.log('profiles表策略设置完成');

    console.log('数据库设置完成！');
  } catch (error) {
    console.error('设置数据库时出错:', error);
  }
}

setupDatabase();