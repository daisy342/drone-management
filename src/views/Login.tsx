import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveRememberedCredentials, getRememberedCredentials } from '../services/auth';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({
    username: '',
    password: ''
  });
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // 管理body滚动
  useEffect(() => {
    document.body.classList.add('login-page');

    const rememberedCreds = getRememberedCredentials();
    if (rememberedCreds) {
      setForm({
        username: rememberedCreds.username,
        password: rememberedCreds.password
      });
      setRemember(true);
    }

    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) {
      setError('');
    }
  };

  const handleRememberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemember(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (form.password.length < 6) {
        throw new Error('密码长度至少为6个字符');
      }
      
      await login(form.username, form.password);

      if (remember) {
        saveRememberedCredentials(form.username, form.password);
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">✈️</div>
            <h1 className="logo-name">无人机管理系统</h1>
          </div>
          <h2>用户登录</h2>
          <p>请输入您的用户名和密码以访问系统</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <div className="input-container">
              <span className="input-icon">👤</span>
              <input
                  type="text"
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="请输入用户名"
                />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="input-container">
              <span className="input-icon">🔒</span>
              <input
                  type="password"
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="请输入密码"
                />
            </div>
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input 
                type="checkbox" 
                id="remember" 
                checked={remember}
                onChange={handleRememberChange}
              />
              <label htmlFor="remember">记住我</label>
            </div>
            <a href="#" className="forgot-password">忘记密码?</a>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading"></span>
                <span>登录中...</span>
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 无人机管理系统. 保留所有权利.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;