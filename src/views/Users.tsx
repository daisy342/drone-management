import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUser, deleteUser, addUser } from '../services/userManagement';
import Navbar from '../components/Navbar';
import './Users.css';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await getAllUsers();
      setUsers(userData);
    } catch (err: any) {
      setError(err.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？此操作不可逆。')) {
      return;
    }

    try {
      await deleteUser(userId);
      loadUsers(); // 重新加载用户列表
    } catch (err: any) {
      setError(err.message || '删除用户失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // 编辑用户
        await updateUser(editingUser.id, formData);
      } else {
        // 新增用户
        await addUser(formData.username, formData.password, formData.email, formData.role);
      }
      setShowForm(false);
      setEditingUser(null);
      loadUsers(); // 重新加载用户列表
    } catch (err: any) {
      setError(err.message || (editingUser ? '更新用户失败' : '新增用户失败'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: '' });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: '' });
  };

  if (loading) {
    return (
      <div className="users">
        <Navbar />

        {/* 主内容 */}
        <div className="main-content">
          <div className="container">
            {/* 欢迎区域 */}
            <div className="welcome-section">
              <h1>用户管理</h1>
              <p>管理系统用户账号</p>
            </div>

            <div className="loading-container">
              <span className="loading"></span>
              <span className="loading-text">加载中...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users">
      <Navbar />

      {/* 主内容 */}
      <div className="main-content">
        <div className="container">
          {/* 欢迎区域 */}
          <div className="welcome-section">
            <h1>用户管理</h1>
            <p>管理系统用户账号</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => handleAddUser()}
            >
              新增用户
            </button>
          </div>

          {/* 用户表格 */}
          <div className="table-container">
            <div className="table-header">
              <h3>用户列表</h3>
            </div>
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>角色</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id?.substring(0, 8)}...</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`tag tag-${user.role === 'admin' ? 'success' : user.role === 'user' ? 'info' : 'warning'}`}>
                          {user.role === 'admin' ? '管理员' : user.role === 'user' ? '普通用户' : '查看者'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleString()}</td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEdit(user)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(user.id)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 用户表单 */}
          {showForm && (
            <div className="drawer-overlay" onClick={handleCancel}>
              <div className="drawer" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                  <h3>{editingUser ? `编辑用户 - ${editingUser?.username}` : '新增用户'}</h3>
                  <button
                    type="button"
                    className="drawer-close"
                    onClick={handleCancel}
                  >
                    ✕
                  </button>
                </div>
                <div className="drawer-body">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label htmlFor="username">用户名</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">邮箱</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      {!editingUser && (
                        <div className="form-group col-span-2">
                          <label htmlFor="password">密码</label>
                          <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="至少6个字符"
                          />
                        </div>
                      )}
                      <div className="form-group col-span-2">
                        <label htmlFor="role">角色</label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          required
                        >
                          <option value="">选择角色</option>
                          <option value="admin">管理员</option>
                          <option value="user">普通用户</option>
                          <option value="viewer">查看者</option>
                        </select>
                      </div>
                    </div>
                    <div className="drawer-footer">
                      <div className="form-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel} style={{ width: '80px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          取消
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ width: '80px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {editingUser ? '保存' : '新增'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;