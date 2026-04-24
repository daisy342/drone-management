import { supabase } from './supabase';

// 检查表是否存在的函数
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    // 如果没有错误，则表存在
    return !error;
  } catch (err) {
    return false;
  }
};

// 创建logs表的函数
export const createLogsTable = async () => {
  // 在 Supabase 中，表结构是通过 SQL 在数据库中直接创建的
  // 我们无法通过客户端 API 直接创建表
  // 因此，这里提供一个提示给用户，告诉他们需要在 Supabase 控制台中创建表
  console.log(`
    要创建 'logs' 表，请按照以下步骤操作：

    1. 登录到 Supabase 控制台：https://supabase.com/dashboard
    2. 选择你的项目
    3. 点击左侧菜单中的 "SQL 编辑器"
    4. 在查询框中粘贴以下 SQL 命令：

    CREATE TABLE IF NOT EXISTS logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      base_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      flight_duration INTEGER NOT NULL,
      coverage_area NUMERIC NOT NULL,
      issues JSONB DEFAULT '[]'::jsonb,
      photos TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_logs_base_id ON logs(base_id);
    CREATE INDEX IF NOT EXISTS idx_logs_route_id ON logs(route_id);
    CREATE INDEX IF NOT EXISTS idx_logs_area_id ON logs(area_id);
    CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);

    5. 点击 "运行" 按钮执行命令
  `);

  throw new Error(
    "无法通过客户端创建表。请按照控制台中的说明，在 Supabase 项目控制台的 SQL 编辑器中运行相应的 SQL 命令来创建 'logs' 表。"
  );
};

// 初始化数据库表
export const initializeDatabase = async () => {
  const logsTableExists = await checkTableExists('logs');

  if (!logsTableExists) {
    console.log("检测到 'logs' 表不存在，正在初始化...");
    await createLogsTable();
  }

  // 检查其他必需的表
  const basesTableExists = await checkTableExists('bases');
  const routesTableExists = await checkTableExists('routes');
  const areasTableExists = await checkTableExists('areas');
  const profilesTableExists = await checkTableExists('profiles');

  if (!basesTableExists) {
    console.log(`
      要创建 'bases' 表，请按照以下步骤操作：

      1. 登录到 Supabase 控制台：https://supabase.com/dashboard
      2. 选择你的项目
      3. 点击左侧菜单中的 "SQL 编辑器"
      4. 在查询框中粘贴以下 SQL 命令：

      CREATE TABLE IF NOT EXISTS bases (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bases_code ON bases(code);
    `);
  }

  if (!routesTableExists) {
    console.log(`
      要创建 'routes' 表，请按照以下步骤操作：

      1. 登录到 Supabase 控制台：https://supabase.com/dashboard
      2. 选择你的项目
      3. 点击左侧菜单中的 "SQL 编辑器"
      4. 在查询框中粘贴以下 SQL 命令：

      CREATE TABLE IF NOT EXISTS routes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        base_id TEXT NOT NULL,
        length NUMERIC NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_routes_base_id ON routes(base_id);
      CREATE INDEX IF NOT EXISTS idx_routes_code ON routes(code);
    `);
  }

  if (!areasTableExists) {
    console.log(`
      要创建 'areas' 表，请按照以下步骤操作：

      1. 登录到 Supabase 控制台：https://supabase.com/dashboard
      2. 选择你的项目
      3. 点击左侧菜单中的 "SQL 编辑器"
      4. 在查询框中粘贴以下 SQL 命令：

      CREATE TABLE IF NOT EXISTS areas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        route_id TEXT NOT NULL,
        area NUMERIC NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_areas_route_id ON areas(route_id);
      CREATE INDEX IF NOT EXISTS idx_areas_code ON areas(code);
    `);
  }

  if (!profilesTableExists) {
    console.log(`
      要创建 'profiles' 表，请按照以下步骤操作：

      1. 登录到 Supabase 控制台：https://supabase.com/dashboard
      2. 选择你的项目
      3. 点击左侧菜单中的 "SQL 编辑器"
      4. 在查询框中粘贴以下 SQL 命令：

      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    `);
  }

  // 检查 dictionary 表
  const dictionaryTableExists = await checkTableExists('dictionary');
  if (!dictionaryTableExists) {
    console.log(`
      要创建 'dictionary' 表，请按照以下步骤操作：

      1. 登录到 Supabase 控制台：https://supabase.com/dashboard
      2. 选择你的项目
      3. 点击左侧菜单中的 "SQL 编辑器"
      4. 在查询框中粘贴以下 SQL 命令：

      CREATE TABLE IF NOT EXISTS dictionary (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        type TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        extra_data JSONB DEFAULT '{}'::jsonb,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dictionary_type ON dictionary(type);
      CREATE INDEX IF NOT EXISTS idx_dictionary_type_active ON dictionary(type, is_active);
      CREATE INDEX IF NOT EXISTS idx_dictionary_code ON dictionary(code);
      CREATE INDEX IF NOT EXISTS idx_dictionary_sort ON dictionary(sort_order);
    `);
  }

  console.log("数据库初始化完成检查");
};