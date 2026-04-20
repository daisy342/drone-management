import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './views/Home';
import Login from './views/Login';
import Logs from './views/Logs';
import Analysis from './views/Analysis';
import Settings from './views/Settings';
import Users from './views/Users';
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const location = useLocation();
  const { user, autoLogin } = useAuth();
  const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    const attemptAutoLogin = async () => {
      if (user) {
        setIsAutoLoginAttempted(true);
        return;
      }

      await autoLogin();
      setIsAutoLoginAttempted(true);
    };

    if (!user && !isAutoLoginAttempted) {
      attemptAutoLogin();
    }
  }, [user, autoLogin, isAutoLoginAttempted]);

  if (!user && !isAutoLoginAttempted) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>正在自动登录...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <main className={isLoginPage ? 'login-layout' : ''}>
        <Routes>
          {/* 如果用户已登录则重定向到首页，否则重定向到登录页 */}
          <Route path="/" element={
            user ? <Home /> : <Navigate to="/login" replace />
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/logs" element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;