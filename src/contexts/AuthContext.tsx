import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated, onAuthStateChange, login as loginService, logout as logoutService, getRememberedCredentials } from '../services/auth';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  autoLogin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 自定义 Hook 来使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 认证提供者组件
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 检查初始认证状态
    const checkInitialAuthStatus = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking initial auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkInitialAuthStatus();

    // 设置认证状态变化监听器
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 自动登录函数
  const autoLogin = async () => {
    const credentials = getRememberedCredentials();
    if (!credentials) {
      return false;
    }

    try {
      const userData = await loginService(credentials.username, credentials.password);
      setUser(userData.user);
      return true;
    } catch (error) {
      console.error('Auto login failed:', error);
      return false;
    }
  };

  // 登录函数
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const userData = await loginService(username, password);
      setUser(userData.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = async () => {
    setLoading(true);
    try {
      await logoutService();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    autoLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};