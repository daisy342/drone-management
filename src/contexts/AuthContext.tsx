import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated, onAuthStateChange, login as loginService, logout as logoutService, getRememberedCredentials } from '../services/auth';
import { getCurrentUserRole, getCurrentUserPermissions, clearPermissionCache } from '../utils/permissions';
import { createOperationLog } from '../services/operationLog';

interface AuthContextType {
  user: any;
  userRole: string;
  userPermissions: string[];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  autoLogin: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
  refreshPermissions: () => Promise<void>;
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
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 加载用户权限信息
  const loadUserPermissions = async () => {
    if (!user) {
      setUserRole('');
      setUserPermissions([]);
      return;
    }
    try {
      // 并行加载用户角色和权限，传递已获取的用户对象
      const [role, permissions] = await Promise.all([
        getCurrentUserRole(user),
        getCurrentUserPermissions(user)
      ]);
      setUserRole(role);
      setUserPermissions(permissions);
    } catch (error) {
      setUserRole('viewer');
      setUserPermissions([]);
    }
  };

  useEffect(() => {
    // 检查初始认证状态
    const checkInitialAuthStatus = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          // 并行加载用户角色和权限，传递已获取的用户对象
          const [role, permissions] = await Promise.all([
            getCurrentUserRole(currentUser),
            getCurrentUserPermissions(currentUser)
          ]);
          setUserRole(role);
          setUserPermissions(permissions);
        }
      } catch (error) {
        // 忽略错误
      } finally {
        setLoading(false);
      }
    };

    checkInitialAuthStatus();

    // 设置认证状态变化监听器
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        const currentUser = session?.user;
        setUser(currentUser);
        // 并行加载用户角色和权限，传递已获取的用户对象
        const [role, permissions] = await Promise.all([
          getCurrentUserRole(currentUser),
          getCurrentUserPermissions(currentUser)
        ]);
        setUserRole(role);
        setUserPermissions(permissions);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole('');
        setUserPermissions([]);
        clearPermissionCache();
      }
    });

    // 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 当用户变化时重新加载权限
  useEffect(() => {
    loadUserPermissions();
  }, [user?.id]);

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
      return false;
    }
  };

  // 登录函数
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const userData = await loginService(username, password);
      const currentUser = userData.user;
      setUser(currentUser);
      // 并行加载用户角色和权限，传递已获取的用户对象
      const [role, permissions] = await Promise.all([
        getCurrentUserRole(currentUser),
        getCurrentUserPermissions(currentUser)
      ]);
      setUserRole(role);
      setUserPermissions(permissions);
      // 记录登录日志
      try {
        await createOperationLog({
          user_id: currentUser.id,
          username: username,
          action_type: 'LOGIN',
          target_type: 'USER',
          target_id: currentUser.id,
          target_name: username,
          description: '用户登录系统'
        });
      } catch (logError) {
        // 忽略记录操作日志的错误
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = async () => {
    setLoading(true);
    try {
      // 记录登出日志
      if (user) {
        try {
          await createOperationLog({
            user_id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'unknown',
            action_type: 'LOGOUT',
            target_type: 'USER',
            target_id: user.id,
            target_name: user.user_metadata?.username || user.email?.split('@')[0] || 'unknown',
            description: '用户登出系统'
          });
        } catch (logError) {
          // 忽略记录登出日志的错误
        }
      }
      await logoutService();
      setUser(null);
      setUserRole('');
      setUserPermissions([]);
      clearPermissionCache();
    } catch (error) {
      // 忽略登出错误
    } finally {
      setLoading(false);
    }
  };

  // 权限检查函数（同步版本，使用缓存的权限）
  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (userPermissions.includes('all')) {
      return true;
    }
    return permissions.some(p => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (userPermissions.includes('all')) {
      return true;
    }
    return permissions.every(p => userPermissions.includes(p));
  };

  const isAdmin = (): boolean => {
    return userRole === 'admin' || userPermissions.includes('all');
  };

  // 刷新权限
  const refreshPermissions = async () => {
    clearPermissionCache();
    await loadUserPermissions();
  };

  const value = {
    user,
    userRole,
    userPermissions,
    loading,
    login,
    logout,
    autoLogin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    refreshPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};