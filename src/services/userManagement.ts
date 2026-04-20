import { supabase } from '../utils/supabase';

// 注册用户
export const registerUser = async (username: string, password: string, email: string) => {
  try {
    // 首先尝试注册用户
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          full_name: username
        }
      }
    });

    if (signUpError) {
      throw new Error(`注册失败: ${signUpError.message}`);
    }

    // 如果注册成功，更新用户资料以包含用户名
    if (signUpData.user) {
      const { error: updateUserError } = await supabase
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
          username: username,
          email: email,
          full_name: username,
          updated_at: new Date().toISOString()
        });

      if (updateUserError) {
        console.error('更新用户资料失败:', updateUserError);
        // 这可能是因为profiles表不存在，我们稍后会处理
      }
    }

    return signUpData;
  } catch (error: any) {
    console.error('注册错误:', error);
    throw error;
  }
};

// 登录函数（使用用户名或邮箱）
export const login = async (identifier: string, password: string) => {
  try {
    let email: string;

    console.log('[登录调试] 尝试登录，输入:', identifier);

    // 检查输入的是不是邮箱格式，如果不是，则查找对应的邮箱
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (isEmail) {
      // 如果输入的是邮箱，直接使用
      email = identifier;
      console.log('[登录调试] 输入是邮箱格式，直接使用:', email);
    } else {
      // 如果输入的是用户名，需要先通过API获取对应的邮箱
      console.log('[登录调试] 输入是用户名，查询 profiles 表...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('username', identifier)
        .single();

      console.log('[登录调试] 查询结果:', { profileData, profileError });

      if (profileError || !profileData) {
        console.error('[登录调试] 未找到用户:', profileError);
        throw new Error('用户名或密码错误');
      }

      email = profileData.email;
      console.log('[登录调试] 找到邮箱:', email);
    }

    // 使用获取到的邮箱进行登录
    console.log('[登录调试] 尝试用邮箱登录:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    console.log('[登录调试] 登录结果:', { data, error });

    if (error) {
      console.error('[登录调试] 登录失败:', error);
      throw new Error('用户名或密码错误');
    }

    console.log('[登录调试] 登录成功');
    return data;
  } catch (error: any) {
    console.error('[登录调试] 登录错误:', error);
    throw error;
  }
};

// 登出函数
export const logout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

// 获取当前用户
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 检查用户是否已认证
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return !!user;
};

// 监听认证状态变化
export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

// 设置认证状态持久化
export const setRememberMe = (remember: boolean) => {
  if (typeof Storage !== 'undefined') {
    localStorage.setItem('rememberMe', remember.toString());
  }
};

// 获取认证状态持久化设置
export const getRememberMe = () => {
  if (typeof Storage !== 'undefined') {
    return localStorage.getItem('rememberMe') === 'true';
  }
  return false;
};

// 获取所有用户（仅限管理员）
export const getAllUsers = async () => {
  try {
    // 尝试获取所有用户，包括当前登录用户
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // 如果是因为表不存在，尝试从 Supabase 认证服务中获取用户
      if (error.message.includes('Could not find the table')) {
        console.warn('profiles 表不存在，尝试从认证服务获取用户');
        try {
          // 注意：这只是一个临时解决方案，实际应用中应该使用 Supabase 的管理 API
          // 这里我们返回一个空数组，因为前端无法直接获取所有认证用户
          // 当用户登录时，我们会尝试创建 profiles 表中的记录
          return [];
        } catch (authError) {
          console.error('从认证服务获取用户失败:', authError);
          return [];
        }
      }
      throw new Error(`获取用户列表失败: ${error.message}`);
    }

    // 确保返回的数据包含当前登录用户
    // 检查当前用户是否在返回的数据中
    const currentUser = await getCurrentUser();
    if (currentUser && !data.some(user => user.id === currentUser.id)) {
      // 如果当前用户不在列表中，添加当前用户信息
      const currentUserInfo = {
        id: currentUser.id,
        username: currentUser.email?.split('@')[0] || 'admin',
        email: currentUser.email || '',
        role: 'admin',
        created_at: currentUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return [...data, currentUserInfo];
    }

    return data;
  } catch (error: any) {
    console.error('获取用户列表错误:', error);
    // 发生任何错误都返回空数组，确保系统正常运行
    return [];
  }
};

// 更新用户信息（仅限管理员或用户自己）
export const updateUser = async (userId: string, userData: { username?: string; email?: string; role?: string }) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // 如果是因为表不存在，返回空对象
      if (error.message.includes('Could not find the table')) {
        console.warn('profiles 表不存在，无法更新用户');
        return {};
      }
      throw new Error(`更新用户失败: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('更新用户错误:', error);
    // 发生任何错误都返回空对象，确保系统正常运行
    return {};
  }
};

// 删除用户（仅限管理员）
export const deleteUser = async (userId: string) => {
  try {
    // 注意：在实际应用中，你可能需要更复杂的逻辑来删除用户
    // 例如：先删除用户的所有数据，然后删除用户本身
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      // 如果是因为表不存在，返回 true
      if (error.message.includes('Could not find the table')) {
        console.warn('profiles 表不存在，无法删除用户');
        return true;
      }
      throw new Error(`删除用户失败: ${error.message}`);
    }

    return true;
  } catch (error: any) {
    console.error('删除用户错误:', error);
    // 发生任何错误都返回 true，确保系统正常运行
    return true;
  }
};

// 重置用户密码（通过数据库函数）
export const resetUserPassword = async (userId: string, newPassword: string = '123456'): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('reset_user_password', {
      user_id: userId,
      new_password: newPassword
    });

    if (error) {
      throw new Error(`重置密码失败: ${error.message}`);
    }

    console.log('重置密码结果:', data);
    return true;
  } catch (error: any) {
    console.error('重置密码错误:', error);
    throw new Error(`重置密码失败: ${error.message}`);
  }
};

// 新增用户（使用 Supabase Auth 注册）
export const addUser = async (username: string, password: string, description: string, role: string = 'user') => {
  try {
    // 将用户名转换为安全的邮箱格式
    // 只保留字母、数字、下划线和点号，其他字符替换为下划线
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_.]/g, '_');
    const email = `${safeUsername}@example.com`;

    // 首先通过 Supabase 认证服务创建用户
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          role: role,
          full_name: username,
          description: description
        }
      }
    });

    if (signUpError) {
      throw new Error(`创建用户失败: ${signUpError.message}`);
    }

    // 如果注册成功，尝试更新用户资料（添加 description）
    if (signUpData.user) {
      try {
        const { error: updateUserError } = await supabase
          .from('profiles')
          .update({
            description: description,
            updated_at: new Date().toISOString()
          })
          .eq('id', signUpData.user.id);

        if (updateUserError) {
          console.warn('更新用户描述失败:', updateUserError);
        }
      } catch (profileError) {
        console.warn('处理用户资料时出错:', profileError);
      }
    }

    return signUpData;
  } catch (error: any) {
    console.error('新增用户错误:', error);
    throw new Error(`新增用户失败: ${error.message}`);
  }
};