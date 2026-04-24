import { supabase } from './supabase';

// 权限定义
export const PERMISSIONS = {
  // 日志相关权限
  LOGS_READ: 'logs:read',
  LOGS_CREATE: 'logs:create',
  LOGS_UPDATE: 'logs:update',
  LOGS_DELETE: 'logs:delete',

  // 分析相关权限
  ANALYSIS_READ: 'analysis:read',
  ANALYSIS_EXPORT: 'analysis:export',

  // 设置相关权限
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  // 用户管理权限
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',

  // 角色管理权限
  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',

  // 操作日志权限
  OPERATION_LOGS_READ: 'operation_logs:read',
  OPERATION_LOGS_MANAGE: 'operation_logs:manage',

  // 超级权限
  ALL: 'all',
} as const;



// 角色权限映射（前端使用的默认映射，实际应从数据库获取）
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  admin: ['all'],
  user: ['logs:read', 'logs:create', 'logs:update', 'analysis:read', 'analysis:export', 'settings:read'],
  viewer: ['logs:read', 'analysis:read', 'settings:read'],
};

// 缓存用户权限、用户ID和用户角色
let cachedUserPermissions: string[] | null = null;
let cachedUserId: string | null = null;
let cachedUserRole: string | null = null;

/**
 * 获取当前用户的权限列表
 * @param user 可选的用户对象，如果不提供则从 supabase.auth.getUser() 获取
 */
export const getCurrentUserPermissions = async (user?: any): Promise<string[]> => {
  try {
    // 获取当前用户
    const currentUser = user || (await supabase.auth.getUser()).data.user;

    if (!currentUser) {
      cachedUserPermissions = [];
      cachedUserId = null;
      return [];
    }

    // 获取用户名 - 优先顺序：user_metadata.username > email 前缀
    let username: string | undefined = currentUser.user_metadata?.username as string;
    if (!username && currentUser.email) {
      username = currentUser.email.split('@')[0];
    }

    // 如果用户名为 'admin'，直接返回 admin 角色的权限，不依赖缓存
    if (username === 'admin') {
      cachedUserPermissions = ROLE_PERMISSIONS_MAP.admin;
      cachedUserId = currentUser.id;
      return ROLE_PERMISSIONS_MAP.admin;
    }

    // 优先使用 user_metadata 中的 role 和 permissions
    const metadataRole = currentUser.user_metadata?.role as string;

    if (metadataRole === 'admin') {
      cachedUserPermissions = ROLE_PERMISSIONS_MAP.admin;
      cachedUserId = currentUser.id;
      return ROLE_PERMISSIONS_MAP.admin;
    }

    if (metadataRole && ROLE_PERMISSIONS_MAP[metadataRole]) {
      const permissions = ROLE_PERMISSIONS_MAP[metadataRole];
      cachedUserPermissions = permissions;
      cachedUserId = currentUser.id;
      return permissions;
    }

    // 如果缓存的用户权限还在有效期内，直接返回
    if (cachedUserPermissions && cachedUserId === currentUser.id) {
      return cachedUserPermissions;
    }

    // 尝试从 profiles 表获取用户角色
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (!error && profile?.role) {
        const role = profile.role;

        // 如果是 admin 角色，直接返回 admin 权限
        if (role === 'admin') {
          cachedUserPermissions = ROLE_PERMISSIONS_MAP.admin;
          cachedUserId = currentUser.id;
          return ROLE_PERMISSIONS_MAP.admin;
        }

        // 尝试从数据库获取角色权限
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('permissions')
            .eq('code', role)
            .single();

          if (!roleError && roleData?.permissions) {
            cachedUserPermissions = roleData.permissions;
          } else {
            // 使用默认映射
            cachedUserPermissions = ROLE_PERMISSIONS_MAP[role] || ROLE_PERMISSIONS_MAP.viewer;
          }
        } catch (roleError) {
          cachedUserPermissions = ROLE_PERMISSIONS_MAP[role] || ROLE_PERMISSIONS_MAP.viewer;
        }

        cachedUserId = currentUser.id;
        return cachedUserPermissions || [];
      }
    } catch (profileError) {
      // 忽略从 profiles 表获取权限失败的错误
    }

    // 默认返回 viewer 权限
    cachedUserPermissions = ROLE_PERMISSIONS_MAP.viewer;
    cachedUserId = currentUser.id;
    return cachedUserPermissions || [];
  } catch (error) {
    return ROLE_PERMISSIONS_MAP.viewer;
  }
};

/**
 * 检查当前用户是否有指定权限
 * @param permission 要检查的权限
 * @returns 是否有该权限
 */
export const hasPermission = async (permission: string): Promise<boolean> => {
  const permissions = await getCurrentUserPermissions();
  return permissions.includes('all') || permissions.includes(permission);
};

/**
 * 检查当前用户是否有多个权限中的任意一个
 * @param permissions 要检查的权限列表
 * @returns 是否有其中任意一个权限
 */
export const hasAnyPermission = async (permissions: string[]): Promise<boolean> => {
  const userPermissions = await getCurrentUserPermissions();
  if (userPermissions.includes('all')) {
    return true;
  }
  return permissions.some(p => userPermissions.includes(p));
};

/**
 * 检查当前用户是否拥有所有指定权限
 * @param permissions 要检查的权限列表
 * @returns 是否拥有所有权限
 */
export const hasAllPermissions = async (permissions: string[]): Promise<boolean> => {
  const userPermissions = await getCurrentUserPermissions();
  if (userPermissions.includes('all')) {
    return true;
  }
  return permissions.every(p => userPermissions.includes(p));
};

/**
 * 获取当前用户的角色
 * @param user 可选的用户对象，如果不提供则从 supabase.auth.getUser() 获取
 */
export const getCurrentUserRole = async (user?: any): Promise<string> => {
  try {
    const currentUser = user || (await supabase.auth.getUser()).data.user;

    if (!currentUser) {
      return 'viewer';
    }

    // 检查缓存
    if (cachedUserRole && cachedUserId === currentUser.id) {
      return cachedUserRole;
    }

    // 获取用户名 - 优先顺序：user_metadata.username > email 前缀
    let username: string | undefined = currentUser.user_metadata?.username as string;
    if (!username && currentUser.email) {
      username = currentUser.email.split('@')[0];
    }

    // 如果用户名为 'admin'，直接返回 'admin' 角色，不依赖数据库
    if (username === 'admin') {
      cachedUserRole = 'admin';
      cachedUserId = currentUser.id;
      return 'admin';
    }

    // 如果 user_metadata 中有 role，直接使用
    const metadataRole = currentUser.user_metadata?.role as string;
    if (metadataRole) {
      cachedUserRole = metadataRole;
      cachedUserId = currentUser.id;
      return metadataRole;
    }

    // 尝试从 profiles 表获取角色
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (!error && profile?.role) {
        cachedUserRole = profile.role;
        cachedUserId = currentUser.id;
        return profile.role;
      }
    } catch (profileError) {
      // 忽略从 profiles 表获取角色失败的错误
    }

    // 默认返回 viewer
    cachedUserRole = 'viewer';
    cachedUserId = currentUser.id;
    return 'viewer';
  } catch (error) {
    return 'viewer';
  }
};

/**
 * 清除权限缓存
 * 在用户登出或角色变更时调用
 */
export const clearPermissionCache = () => {
  cachedUserPermissions = null;
  cachedUserId = null;
  cachedUserRole = null;
};

/**
 * 根据角色代码获取该角色的默认权限
 * @param roleCode 角色代码
 * @returns 权限列表
 */
export const getDefaultPermissionsByRole = (roleCode: string): string[] => {
  return ROLE_PERMISSIONS_MAP[roleCode] || ROLE_PERMISSIONS_MAP.viewer;
};

/**
 * 判断角色是否为管理员
 * @param roleCode 角色代码
 * @returns 是否为管理员
 */
export const isAdminRole = (roleCode: string): boolean => {
  return roleCode === 'admin';
};
