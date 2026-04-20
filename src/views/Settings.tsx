import { useState, useEffect } from 'react';
import Select from 'react-select';
import {
  DictionaryType,
  DictionaryItem,
  dictionaryTypeConfig,
  getDictionaryItems,
  createDictionaryItem,
  updateDictionaryItem,
  deleteDictionaryItem,
  importDictionaryData,
  exportDictionaryData,
  getBases,
  getRoutes
} from '../services/dictionary';
import { getAllUsers, updateUser, deleteUser, addUser, resetUserPassword } from '../services/userManagement';
import { getAllRoles, createRole, updateRole, deleteRole, getAllPermissions, Role } from '../services/roleManagement';
import Navbar from '../components/Navbar';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'dictionary'>('users');
  const [dictionaryType, setDictionaryType] = useState<DictionaryType>('base_station');
  const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBase, setSelectedBase] = useState('');

  // 用户表单状态
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: '',
    description: ''
  });

  // 角色表单状态
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as string[]
  });

  // 数据字典表单状态
  const [dictForm, setDictForm] = useState<{
    code: string;
    name: string;
    description: string;
    extra_data: Record<string, any>;
    sort_order: number;
  }>({
    code: '',
    name: '',
    description: '',
    extra_data: {},
    sort_order: 0
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab, dictionaryType, selectedBase]);

  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'dictionary':
          const itemsData = await getDictionaryItems(dictionaryType);
          setDictionaryItems(itemsData);
          // 加载基站列表（用于航线和覆盖范围的关联）
          if (dictionaryType === 'route' || dictionaryType === 'coverage_area') {
            const basesData = await getBases();
            setBases(basesData);
          }
          // 加载航线列表（用于覆盖范围的关联）
          if (dictionaryType === 'coverage_area' && selectedBase) {
            const routesData = await getRoutes(selectedBase);
            setRoutes(routesData);
          }
          break;
        case 'users':
          const usersData = await getAllUsers();
          setUsers(usersData);
          break;
        case 'roles':
          const rolesData = await getAllRoles();
          setRoles(rolesData);
          break;
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理表单输入变化
  const handleDictChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('extra_')) {
      const extraKey = name.replace('extra_', '');
      setDictForm(prev => ({
        ...prev,
        extra_data: { ...prev.extra_data, [extraKey]: value }
      }));
    } else if (name === 'sort_order') {
      setDictForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setDictForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // 重置数据字典表单
  const resetDictForm = () => {
    const config = dictionaryTypeConfig[dictionaryType];
    const defaultExtraData: Record<string, any> = {};
    config.extraFields.forEach(field => {
      defaultExtraData[field.key] = field.type === 'number' ? 0 : '';
    });
    setDictForm({
      code: '',
      name: '',
      description: '',
      extra_data: defaultExtraData,
      sort_order: 0
    });
    setEditingItem(null);
    setSelectedBase('');
  };

  // 提交数据字典表单
  const handleDictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingItem) {
        await updateDictionaryItem(editingItem.id, {
          code: dictForm.code,
          name: dictForm.name,
          description: dictForm.description,
          extra_data: dictForm.extra_data,
          sort_order: dictForm.sort_order
        });
      } else {
        await createDictionaryItem({
          type: dictionaryType,
          code: dictForm.code,
          name: dictForm.name,
          description: dictForm.description,
          extra_data: dictForm.extra_data,
          sort_order: dictForm.sort_order,
          is_active: true
        });
      }
      loadData();
      setShowForm(false);
      resetDictForm();
    } catch (err: any) {
      setError(err.message || '保存数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理用户表单输入变化
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 重置用户表单
  const resetUserForm = () => {
    setUserForm({ username: '', password: '', role: '', description: '' });
  };

  // 编辑项目
  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'users') {
      setUserForm({
        username: item.username || '',
        password: '',
        role: item.role || '',
        description: item.description || ''
      });
    } else if (activeTab === 'roles') {
      setRoleForm({
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        permissions: item.permissions || []
      });
    } else if (activeTab === 'dictionary') {
      setDictForm({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        extra_data: item.extra_data || {},
        sort_order: item.sort_order || 0
      });
      // 如果是航线，设置选中的基站
      if (dictionaryType === 'route' && item.extra_data?.base_station_id) {
        setSelectedBase(item.extra_data.base_station_id);
      }
    }
    setShowForm(true);
  };

  // 删除项目
  const handleDelete = async (id: string) => {
    if (activeTab === 'users') {
      if (!window.confirm('确定要删除这个用户吗？此操作不可逆。')) return;
    } else {
      if (!confirm('确定要删除这条记录吗？')) return;
    }

    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'dictionary':
          await deleteDictionaryItem(id);
          break;
        case 'users':
          await deleteUser(id);
          break;
        case 'roles':
          await deleteRole(id);
          break;
      }
      loadData();
    } catch (err: any) {
      setError(err.message || '删除数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理用户密码重置
  const handleResetPassword = async (userId: string, username: string) => {
    if (!window.confirm(`确定要重置用户 "${username}" 的密码吗？\\n密码将被重置为: 123456`)) return;

    setIsLoading(true);
    try {
      await resetUserPassword(userId, '123456');
      alert(`用户 "${username}" 的密码已重置为: 123456`);
    } catch (err: any) {
      setError(err.message || '重置密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoleForm(prev => ({ ...prev, [name]: value }));
  };

  // 处理权限选择
  const handlePermissionChange = (permission: string) => {
    setRoleForm(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  // 重置角色表单
  const resetRoleForm = () => {
    setRoleForm({ name: '', code: '', description: '', permissions: [] });
  };

  // 处理角色编辑
  const handleRoleEdit = (role: Role) => {
    setEditingItem(role);
    setRoleForm({
      name: role.name || '',
      code: role.code || '',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setShowForm(true);
  };

  // 处理角色删除
  const handleRoleDelete = async (roleId: string) => {
    if (!window.confirm('确定要删除这个角色吗？此操作不可逆。')) return;

    setIsLoading(true);
    try {
      await deleteRole(roleId);
      loadData();
    } catch (err: any) {
      setError(err.message || '删除角色失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 提交角色表单
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingItem) {
        await updateRole(editingItem.id, roleForm);
      } else {
        await createRole(roleForm);
      }
      loadData();
      setShowForm(false);
      resetRoleForm();
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message || (editingItem ? '更新角色失败' : '新增角色失败'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingItem) {
        // 编辑时不传递 password 字段
        const { password, ...userDataWithoutPassword } = userForm;
        await updateUser(editingItem.id, userDataWithoutPassword);
      } else {
        await addUser(userForm.username, userForm.password, userForm.description, userForm.role);
      }
      loadData();
      setShowForm(false);
      resetUserForm();
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message || (editingItem ? '更新用户失败' : '新增用户失败'));
    } finally {
      setIsLoading(false);
    }
  };

  // 导入数据
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\\n').filter(line => line.trim());
        // 跳过表头
        const dataLines = lines.slice(1);
        const data = dataLines.map(line => {
          const [code, name, description, extraData, sortOrder] = line.split(',');
          return {
            code,
            name,
            description,
            extra_data: extraData ? JSON.parse(extraData) : {},
            sort_order: parseInt(sortOrder) || 0
          };
        }).filter(item => item.name);

        await importDictionaryData(dictionaryType, data);
        loadData();
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || '导入数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      await exportDictionaryData(dictionaryType);
    } catch (err: any) {
      setError(err.message || '导出数据失败');
    }
  };

  // 切换字典类型
  const handleDictionaryTypeChange = (type: DictionaryType) => {
    setDictionaryType(type);
    setShowForm(false);
    resetDictForm();
  };

  // 渲染角色表单（抽屉形式）
  const renderRoleForm = () => {
    const allPermissions = getAllPermissions();

    return (
      <>
        <div className="drawer-overlay" onClick={() => {
          setShowForm(false);
          resetRoleForm();
          setEditingItem(null);
        }} />
        <div className="drawer">
          <div className="drawer-header">
            <h3>{editingItem ? `编辑角色 - ${editingItem?.name}` : '新增角色'}</h3>
            <button
              type="button"
              className="drawer-close"
              onClick={() => {
                setShowForm(false);
                resetRoleForm();
                setEditingItem(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="drawer-body">
            <form onSubmit={handleRoleSubmit}>
              <div className="form-group">
                <label htmlFor="name">角色名称</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={roleForm.name}
                  onChange={handleRoleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="code">角色代码</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={roleForm.code}
                  onChange={handleRoleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">描述</label>
                <textarea
                  id="description"
                  name="description"
                  value={roleForm.description}
                  onChange={handleRoleChange}
                  rows={3}
                ></textarea>
              </div>
              <div className="form-group">
                <label>权限配置</label>
                <div className="permissions-list">
                  {allPermissions.map(permission => (
                    <label key={permission.code} className="permission-item">
                      <div className="permission-content">
                        <input
                          type="checkbox"
                          checked={roleForm.permissions.includes(permission.code)}
                          onChange={() => handlePermissionChange(permission.code)}
                        />
                        <span className="permission-name">{permission.name}</span>
                      </div>
                      <span className="permission-desc">{permission.description}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="drawer-footer">
                <div className="form-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowForm(false);
                    resetRoleForm();
                    setEditingItem(null);
                  }} style={{ padding: '8px 16px', height: '40px', minWidth: '80px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '8px 16px', height: '40px', minWidth: '80px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    {isLoading ? (
                      <>
                        <span className="loading"></span>
                        保存中...
                      </>
                    ) : (
                      editingItem ? '保存' : '新增'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  };

  // 渲染数据字典表单
  const renderDictionaryForm = () => {
    const config = dictionaryTypeConfig[dictionaryType];

    return (
      <div className="form-container">
        <h3>{editingItem ? '编辑' : '添加'}{config.name}</h3>
        <form onSubmit={handleDictSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="code">代码</label>
              <input
                type="text"
                id="code"
                name="code"
                value={dictForm.code}
                onChange={handleDictChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="name">名称</label>
              <input
                type="text"
                id="name"
                name="name"
                value={dictForm.name}
                onChange={handleDictChange}
                required
              />
            </div>

            {config.extraFields.map(field => (
              <div className="form-group" key={field.key}>
                <label htmlFor={`extra_${field.key}`}>{field.label}</label>
                {field.key === 'base_station_id' ? (
                  <select
                    id={`extra_${field.key}`}
                    name={`extra_${field.key}`}
                    value={dictForm.extra_data[field.key] || ''}
                    onChange={(e) => {
                      handleDictChange(e);
                      setSelectedBase(e.target.value);
                    }}
                    required
                  >
                    <option value="">请选择基站</option>
                    {bases.map(base => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                ) : field.key === 'route_id' ? (
                  <select
                    id={`extra_${field.key}`}
                    name={`extra_${field.key}`}
                    value={dictForm.extra_data[field.key] || ''}
                    onChange={handleDictChange}
                    required
                    disabled={!selectedBase && dictionaryType === 'coverage_area'}
                  >
                    <option value="">请选择航线</option>
                    {routes.map(route => (
                      <option key={route.id} value={route.id}>{route.name}</option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    id={`extra_${field.key}`}
                    name={`extra_${field.key}`}
                    value={dictForm.extra_data[field.key] || 0}
                    onChange={handleDictChange}
                    required
                    min="0"
                    step={field.key === 'length' || field.key === 'area' ? '0.1' : '1'}
                  />
                ) : (
                  <input
                    type="text"
                    id={`extra_${field.key}`}
                    name={`extra_${field.key}`}
                    value={dictForm.extra_data[field.key] || ''}
                    onChange={handleDictChange}
                  />
                )}
              </div>
            ))}

            <div className="form-group">
              <label htmlFor="sort_order">排序</label>
              <input
                type="number"
                id="sort_order"
                name="sort_order"
                value={dictForm.sort_order}
                onChange={handleDictChange}
                min="0"
              />
            </div>

            <div className="form-group col-span-2">
              <label htmlFor="description">描述</label>
              <textarea
                id="description"
                name="description"
                value={dictForm.description}
                onChange={handleDictChange}
                rows={3}
              ></textarea>
            </div>
          </div>

          <div className="form-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                resetDictForm();
              }}
              style={{ padding: '8px 16px', height: '40px', minWidth: '80px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ padding: '8px 16px', height: '40px', minWidth: '80px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // 渲染用户表单（抽屉形式）
  const renderUserForm = () => {
    return (
      <>
        <div className="drawer-overlay" onClick={() => {
          setShowForm(false);
          resetUserForm();
          setEditingItem(null);
        }} />
        <div className="drawer">
          <div className="drawer-header">
            <h3>{editingItem ? `编辑用户 - ${editingItem?.username}` : '新增用户'}</h3>
            <button
              type="button"
              className="drawer-close"
              onClick={() => {
                setShowForm(false);
                resetUserForm();
                setEditingItem(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="drawer-body">
            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={userForm.username}
                  onChange={handleUserChange}
                  required
                />
              </div>
              {!editingItem && (
                <div className="form-group">
                  <label htmlFor="password">密码</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleUserChange}
                    required
                    placeholder="至少6个字符"
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="role">角色</label>
                <Select
                  id="role"
                  name="role"
                  value={userForm.role ? { value: userForm.role, label: userForm.role === 'admin' ? '管理员' : userForm.role === 'user' ? '普通用户' : '查看者' } : null}
                  onChange={(option: any) => setUserForm(prev => ({ ...prev, role: option?.value || '' }))}
                  options={[
                    { value: 'admin', label: '管理员' },
                    { value: 'user', label: '普通用户' },
                    { value: 'viewer', label: '查看者' }
                  ]}
                  placeholder="选择角色"
                  isClearable={false}
                  isSearchable={false}
                  required
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: 'var(--border-radius)',
                      borderColor: 'var(--border-color)',
                      padding: '2px',
                      minHeight: '48px',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: 'var(--primary-color)'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      marginTop: '4px',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                      zIndex: 100
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? 'var(--primary-color)' : state.isFocused ? 'rgba(67, 97, 238, 0.05)' : 'white',
                      color: state.isSelected ? 'white' : 'var(--text-color)',
                      cursor: 'pointer',
                      padding: '12px 16px'
                    })
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">描述 <span className="optional">（可选）</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={userForm.description}
                  onChange={handleUserChange}
                  rows={3}
                  placeholder="用户描述信息..."
                ></textarea>
              </div>
              <div className="drawer-footer">
                <div className="form-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowForm(false);
                    resetUserForm();
                    setEditingItem(null);
                  }} style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isLoading ? (
                      <>
                        <span className="loading"></span>
                        保存中...
                      </>
                    ) : (
                      editingItem ? '保存' : '新增'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  };

  // 渲染列表
  const renderList = () => {
    if (activeTab === 'users') {
      return renderUserList();
    } else if (activeTab === 'roles') {
      return renderRoleList();
    }
    return renderDictionaryList();
  };

  // 渲染用户列表
  const renderUserList = () => {
    return (
      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333333', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '2px' }}></span>
              用户列表
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              新增用户
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <span className="user-name">{user.username}</span>
                      {user.description && <span className="user-desc">{user.description}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`tag tag-${user.role === 'admin' ? 'success' : user.role === 'user' ? 'info' : 'warning'}`}>
                      {user.role === 'admin' ? '管理员' : user.role === 'user' ? '普通用户' : '查看者'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEdit(user)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResetPassword(user.id, user.username)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        重置密码
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(user.id)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // 渲染角色列表
  const renderRoleList = () => {
    return (
      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333333', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '2px' }}></span>
              角色列表
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              新增角色
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>代码</th>
                <th>描述</th>
                <th>权限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.code}</td>
                  <td>{role.description}</td>
                  <td>
                    {role.permissions?.slice(0, 3).map((p: string) => (
                      <span key={p} className="tag tag-secondary" style={{ marginRight: '4px' }}>
                        {p}
                      </span>
                    ))}
                    {role.permissions?.length > 3 && (
                      <span className="tag tag-info">+{role.permissions.length - 3}</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRoleEdit(role)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRoleDelete(role.id)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // 渲染数据字典列表
  const renderDictionaryList = () => {
    const config = dictionaryTypeConfig[dictionaryType];

    return (
      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333333', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '2px' }}></span>
              {config.name}列表
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
            >
              添加
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
            >
              导出
            </button>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              style={{ display: 'none' }}
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="btn btn-secondary"
              style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
            >
              导入
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                {config.extraFields.map(field => (
                  <th key={field.key}>{field.label}</th>
                ))}
                <th>描述</th>
                <th>排序</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dictionaryItems.map(item => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  {config.extraFields.map(field => (
                    <td key={field.key}>
                      {field.key === 'base_station_id' && item.extra_data?.base_station_id
                        ? bases.find(b => b.id === item.extra_data?.base_station_id)?.name || item.extra_data?.base_station_id
                        : field.key === 'route_id' && item.extra_data?.route_id
                          ? routes.find(r => r.id === item.extra_data?.route_id)?.name || item.extra_data?.route_id
                          : item.extra_data?.[field.key] || '-'}
                    </td>
                  ))}
                  <td>{item.description || '-'}</td>
                  <td>{item.sort_order || 0}</td>
                  <td>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEdit(item)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(item.id!)}
                        style={{ whiteSpace: 'nowrap', margin: 0 }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="settings">
      <Navbar />

      {/* 主内容 */}
      <div className="main-content">
        <div className="container">
          {/* 欢迎区域 */}
          <div className="welcome-section">
            <div className="welcome-content">
              <h1>系统设置</h1>
              <p>管理系统基础数据和用户</p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* 标签页 */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              用户管理
            </button>
            <button
              className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              角色管理
            </button>
            <button
              className={`tab ${activeTab === 'dictionary' ? 'active' : ''}`}
              onClick={() => setActiveTab('dictionary')}
            >
              数据字典
            </button>
          </div>

          {/* 数据字典子标签 */}
          {activeTab === 'dictionary' && (
            <div className="dictionary-tabs" style={{ marginBottom: '16px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(dictionaryTypeConfig).map(([type, config]) => (
                  <button
                    key={type}
                    className={`btn ${dictionaryType === type ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleDictionaryTypeChange(type as DictionaryType)}
                    style={{
                      fontSize: '0.85rem',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: dictionaryType === type ? '600' : '400',
                      background: dictionaryType === type ? '#4361ee' : '#f5f5f5',
                      color: dictionaryType === type ? 'white' : '#666',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 表单 */}
          {showForm && activeTab === 'roles' && renderRoleForm()}
          {showForm && activeTab === 'users' && renderUserForm()}
          {showForm && activeTab === 'dictionary' && renderDictionaryForm()}

          {/* 列表 */}
          {renderList()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
