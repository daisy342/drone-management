import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // 可以返回一个加载指示器
    return <div>加载中...</div>;
  }

  // 如果用户未登录，则重定向到登录页面，并保存原始路径
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 用户已登录，渲染受保护的内容
  return children;
};

export default ProtectedRoute;