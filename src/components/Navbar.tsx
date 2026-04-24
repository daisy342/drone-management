import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, userRole, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  // 获取显示的用户名 - 优先从 user_metadata.username 获取，然后是 email 前缀
  const getDisplayUsername = () => {
    if (!user) return '用户';
    return user.user_metadata?.username || user.email?.split('@')[0] || '用户';
  };

  // 获取角色显示文本
  const getRoleDisplayText = () => {
    // 如果还在加载中，显示空字符串
    if (!userRole) return '';
    switch (userRole) {
      case 'admin':
        return '管理员';
      case 'user':
        return '普通用户';
      case 'viewer':
        return '查看者';
      default:
        return '普通用户';
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1 className="brand-name">无人机管理系统</h1>
        </div>
        <div className="navbar-menu">
          <Link to="/" className={`navbar-item ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="navbar-item-text">首页</span>
          </Link>
          <Link to="/analysis" className={`navbar-item ${location.pathname === '/analysis' ? 'active' : ''}`}>
            <span className="navbar-item-text">数据分析</span>
          </Link>
          <Link to="/logs" className={`navbar-item ${location.pathname === '/logs' ? 'active' : ''}`}>
            <span className="navbar-item-text">巡查报告</span>
          </Link>
          <Link to="/task-forwards" className={`navbar-item ${location.pathname === '/task-forwards' ? 'active' : ''}`}>
            <span className="navbar-item-text">任务转发</span>
          </Link>
          <Link to="/settings" className={`navbar-item ${location.pathname === '/settings' ? 'active' : ''}`}>
            <span className="navbar-item-text">系统设置</span>
          </Link>
        </div>
        <div
          className="navbar-user-wrapper"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div className="navbar-user">
            <div className="user-avatar">
              {getDisplayUsername().charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{getDisplayUsername()}</div>
              <div className="user-role">{getRoleDisplayText()}</div>
            </div>
            <div className="user-menu">
              <span className="user-menu-icon">▼</span>
            </div>
          </div>
          {showUserMenu && (
            <div className="user-dropdown">
              <button className="logout-button" onClick={handleLogout}>
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;