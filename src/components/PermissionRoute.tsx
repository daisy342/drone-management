import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/permissions';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // 是否需要满足所有权限，默认为false（满足任意一个即可）
  fallback?: React.ReactNode; // 无权限时显示的替代内容
}

// 基于权限的路由守卫组件
const PermissionRoute = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback
}: PermissionRouteProps) => {
  const { user, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>加载中...</div>;
  }

  // 如果用户未登录，则重定向到登录页面
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查权限
  let hasAccess = false;
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    // 如果没有指定权限，默认允许访问
    hasAccess = true;
  }

  // 如果有权限，渲染内容
  if (hasAccess) {
    return <>{children}</>;
  }

  // 如果提供了fallback，显示fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // 默认无权限提示
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚫</div>
      <h2 style={{ color: '#333', marginBottom: '10px' }}>无访问权限</h2>
      <p style={{ color: '#666', maxWidth: '400px' }}>
        您没有权限访问此页面，请联系管理员获取相应权限。
      </p>
    </div>
  );
};

// 便捷组件：需要特定权限
export const RequirePermission = ({
  children,
  permission,
  fallback
}: {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}) => (
  <PermissionRoute permission={permission} fallback={fallback}>
    {children}
  </PermissionRoute>
);

// 便捷组件：需要任意一个权限
export const RequireAnyPermission = ({
  children,
  permissions,
  fallback
}: {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
}) => (
  <PermissionRoute permissions={permissions} fallback={fallback}>
    {children}
  </PermissionRoute>
);

// 便捷组件：需要所有权限
export const RequireAllPermissions = ({
  children,
  permissions,
  fallback
}: {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
}) => (
  <PermissionRoute permissions={permissions} requireAll fallback={fallback}>
    {children}
  </PermissionRoute>
);

// 便捷组件：仅管理员可访问
export const AdminRoute = ({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <PermissionRoute permission={PERMISSIONS.ALL} fallback={fallback}>
    {children}
  </PermissionRoute>
);

export default PermissionRoute;
