import { supabase } from '../utils/supabase';

// 登录函数
export const login = async (username: string, password: string) => {
  console.log('Login attempt with:', username);

  try {
    let email: string;

    // 检查输入的是不是邮箱格式
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

    if (isEmail) {
      // 如果输入的是邮箱，直接使用
      email = username;
      console.log('Using provided email:', email);
    } else {
      // 如果输入的是用户名，需要先通过API获取对应的邮箱
      console.log('Looking up email for username:', username);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        console.log('User not found:', profileError);
        throw new Error('用户名或密码错误');
      }

      email = profileData.email;
      console.log('Found email:', email);
    }

    // 使用获取到的邮箱进行登录
    console.log('Attempting to sign in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    console.log('Sign in result:', { data, error });

    if (error) {
      console.log('Sign in error:', error);
      throw new Error(`用户名或密码错误: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
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

// 保存记住的凭据（用户名和密码）
const CREDENTIALS_KEY = 'rememberedCredentials';
const CREDENTIALS_EXPIRY_KEY = 'rememberedCredentialsExpiry';

export const saveRememberedCredentials = (username: string, password: string) => {
  if (typeof Storage !== 'undefined') {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ username, password }));
    localStorage.setItem(CREDENTIALS_EXPIRY_KEY, expiryDate.toISOString());
    localStorage.setItem('rememberMe', 'true');
  }
};

// 获取记住的凭据（如果未过期）
export const getRememberedCredentials = () => {
  if (typeof Storage !== 'undefined') {
    const expiryStr = localStorage.getItem(CREDENTIALS_EXPIRY_KEY);
    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      const now = new Date();
      if (now < expiryDate) {
        const credentialsStr = localStorage.getItem(CREDENTIALS_KEY);
        if (credentialsStr) {
          try {
            return JSON.parse(credentialsStr);
          } catch (e) {
            console.error('Failed to parse remembered credentials:', e);
          }
        }
      } else {
        clearRememberedCredentials();
      }
    }
  }
  return null;
};

// 清除记住的凭据
export const clearRememberedCredentials = () => {
  if (typeof Storage !== 'undefined') {
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(CREDENTIALS_EXPIRY_KEY);
    localStorage.removeItem('rememberMe');
  }
};