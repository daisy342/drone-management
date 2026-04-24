import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from '../components/CustomSelect';
import YearPicker from '../components/YearPicker';
import Cascader from '../components/Cascader';
import DateRangePicker from '../components/DateRangePicker';
import { showToast } from '../components/Toast';
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
import { getChildRegions, searchRegions, getRegionPath } from '../utils/chinaRegions';

// 获取污染源类型子级
const getChildPollutionTypes = (parentId: string, allTypes: any[]): any[] => {
  if (!parentId) {
    return allTypes
      .filter(item => !item.extra_data?.parent_id || item.extra_data?.parent_id === '')
      .map(item => ({
        code: item.id,
        name: item.name,
        children: getChildPollutionTypes(item.id, allTypes)
      }));
  }
  
  return allTypes
    .filter(item => item.extra_data?.parent_id === parentId)
    .map(item => ({
      code: item.id,
      name: item.name,
      children: getChildPollutionTypes(item.id, allTypes)
    }));
};

// 搜索污染源类型
const searchPollutionTypes = (keyword: string, allTypes: any[]): any[] => {
  const results: any[] = [];
  
  const search = (types: any[]) => {
    for (const type of types) {
      if (type.name.includes(keyword)) {
        results.push({
          code: type.id,
          name: type.name,
          children: getChildPollutionTypes(type.id, allTypes)
        });
      }
    }
  };
  
  search(allTypes);
  return results;
};
import { getAllUsers, updateUser, deleteUser, addUser, resetUserPassword } from '../services/userManagement';
import { getAllRoles, createRole, updateRole, deleteRole, getAllPermissions, Role } from '../services/roleManagement';
import { createOperationLog } from '../services/operationLog';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import Navbar from '../components/Navbar';
import './Settings.css';
import {
  getOperationLogs,
  getActionTypeOptions,
  getTargetTypeOptions,
  OperationLog,
  OperationType,
  TargetType
} from '../services/operationLog';

const Settings = () => {
  const { hasPermission, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'dictionary' | 'operation_logs'>('users');
  const [dictionaryType, setDictionaryType] = useState<DictionaryType>('base_station');
  const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [pollutionTypes, setPollutionTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedBase, setSelectedBase] = useState<string>('');

  // 操作日志相关状态
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [operationLogsTotal, setOperationLogsTotal] = useState(0);
  const [operationLogsPage, setOperationLogsPage] = useState(1);
  const [operationLogsPageSize, setOperationLogsPageSize] = useState(20);
  const [operationLogsFilter, setOperationLogsFilter] = useState({
    username: '',
    action_type: '' as OperationType | '',
    target_type: '' as TargetType | '',
    start_date: '',
    end_date: ''
  });

  // 表单错误状态
  const [formErrors, setFormErrors] = useState({
    user: '',
    role: '',
    dict: ''
  });

  // 用户表单状态
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: '',
    description: '',
    contact_info: ''
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

  // 计算可用的标签页
  const availableTabs = [
    ...(hasPermission(PERMISSIONS.USERS_READ) || hasPermission(PERMISSIONS.USERS_MANAGE) ? ['users'] : []),
    ...(hasPermission(PERMISSIONS.ROLES_READ) || hasPermission(PERMISSIONS.ROLES_MANAGE) ? ['roles'] : []),
    ...(hasPermission(PERMISSIONS.SETTINGS_READ) || hasPermission(PERMISSIONS.SETTINGS_WRITE) ? ['dictionary'] : []),
    ...(hasPermission(PERMISSIONS.OPERATION_LOGS_READ) || hasPermission(PERMISSIONS.OPERATION_LOGS_MANAGE) ? ['operation_logs'] : []),
  ] as ('users' | 'roles' | 'dictionary' | 'operation_logs')[];

  // 使用 useMemo 缓存数据字典的额外字段过滤结果
  const filteredExtraFields = useMemo(() => {
    const config = dictionaryTypeConfig[dictionaryType];
    return config.extraFields.filter(field => {
      const isRequired = ['base_station_id', 'route_id', 'area_id', 'unit_type', 'is_enabled', 'year', 'object_type', 'object_id', 'plan_count', 'quarterly_breakdown', 'parent_id'].includes(field.key);
      return isRequired && !['Q1', 'Q2', 'Q3', 'Q4'].includes(field.key);
    });
  }, [dictionaryType]);

  // 使用 useMemo 缓存根节点
  const rootNodes = useMemo(() => {
    // 对于覆盖范围和污染源类型，使用树形结构
    if (dictionaryType === 'coverage_area') {
      return dictionaryItems;
    } else if (dictionaryType === 'pollution_type') {
      return dictionaryItems.filter(item => !item.extra_data?.parent_id || item.extra_data?.parent_id === '');
    }
    return dictionaryItems.filter(item => !item.extra_data?.parent_id || item.extra_data?.parent_id === '');
  }, [dictionaryItems, dictionaryType]);

  // 如果当前标签页不可用，切换到第一个可用标签页
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab, dictionaryType, selectedBase]);

  // 数据缓存
  const [dataCache, setDataCache] = useState({
    dictionary: {} as Record<string, any[]>,
    bases: [] as any[],
    basesMap: {} as Record<string, any>,
    users: [] as any[],
    usersMap: {} as Record<string, any>,
    routes: {} as Record<string, any[]>,
    routesMap: {} as Record<string, Record<string, any>>,
    areasMap: {} as Record<string, any>,
    pollutionTypesMap: {} as Record<string, any>
  });

  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'dictionary':
          // 直接从数据库加载数据，不使用缓存
          const itemsData = await getDictionaryItems(dictionaryType);
          setDictionaryItems(itemsData);
          setDataCache(prev => ({
            ...prev,
            dictionary: {
              ...prev.dictionary,
              [dictionaryType]: itemsData
            }
          }));
          
          // 加载基站列表（用于航线和覆盖范围的关联）
          if ((dictionaryType === 'route' || dictionaryType === 'coverage_area') && dataCache.bases.length === 0) {
            const basesData = await getBases();
            const basesMap = basesData.reduce((map, base) => {
              if (base.id) {
                map[base.id] = base;
              }
              return map;
            }, {} as Record<string, any>);
            setBases(basesData);
            setDataCache(prev => ({
              ...prev,
              bases: basesData,
              basesMap
            }));
          } else if (dataCache.bases.length > 0) {
            setBases(dataCache.bases);
          }
          
          // 加载覆盖范围列表（用于基站的关联）
          if (dictionaryType === 'base_station' && !dataCache.dictionary['coverage_area']) {
            const areasData = await getDictionaryItems('coverage_area');
            const areasMap = areasData.reduce((map, area) => {
              map[area.id] = area;
              return map;
            }, {} as Record<string, any>);
            setAreas(areasData);
            setDataCache(prev => ({
              ...prev,
              dictionary: {
                ...prev.dictionary,
                coverage_area: areasData
              },
              areasMap
            }));
          } else if (dataCache.dictionary['coverage_area']) {
            setAreas(dataCache.dictionary['coverage_area']);
          }
          
          // 加载航线列表（用于覆盖范围的关联）
          if (dictionaryType === 'coverage_area' && selectedBase) {
            if (!dataCache.routes[selectedBase as string]) {
              const routesData = await getRoutes(selectedBase);
              const routesMap = routesData.reduce((map, route) => {
                if (route.id) {
                  map[route.id] = route;
                }
                return map;
              }, {} as Record<string, any>);
              setRoutes(routesData);
              setDataCache(prev => ({
                ...prev,
                routes: {
                  ...prev.routes,
                  [selectedBase as string]: routesData
                },
                routesMap: {
                  ...prev.routesMap,
                  [selectedBase as string]: routesMap
                }
              }));
            } else {
              setRoutes(dataCache.routes[selectedBase as string]);
            }
          }
          
          // 加载污染源类型列表（用于污染源类型的上级类型关联）
          if (dictionaryType === 'pollution_type' && !dataCache.dictionary['pollution_type']) {
            const pollutionTypesData = await getDictionaryItems('pollution_type');
            const pollutionTypesMap = pollutionTypesData.reduce((map, type) => {
              map[type.id] = type;
              return map;
            }, {} as Record<string, any>);
            setPollutionTypes(pollutionTypesData);
            setDataCache(prev => ({
              ...prev,
              dictionary: {
                ...prev.dictionary,
                pollution_type: pollutionTypesData
              },
              pollutionTypesMap
            }));
          } else if (dataCache.dictionary['pollution_type']) {
            setPollutionTypes(dataCache.dictionary['pollution_type']);
          }
          
          // 加载用户和基站列表（用于巡查次数配置的关联）
          if (dictionaryType === 'inspection_config') {
            if (dataCache.users.length === 0) {
              const usersData = await getAllUsers();
              const usersMap = usersData.reduce((map, user) => {
                if (user.id) {
                  map[user.id] = user;
                }
                return map;
              }, {} as Record<string, any>);
              setUsers(usersData);
              setDataCache(prev => ({
                ...prev,
                users: usersData,
                usersMap
              }));
            } else if (dataCache.users.length > 0) {
              setUsers(dataCache.users);
            }
            
            if (dataCache.bases.length === 0) {
              const basesData = await getBases();
              const basesMap = basesData.reduce((map, base) => {
                if (base.id) {
                  map[base.id] = base;
                }
                return map;
              }, {} as Record<string, any>);
              setBases(basesData);
              setDataCache(prev => ({
                ...prev,
                bases: basesData,
                basesMap
              }));
            } else if (dataCache.bases.length > 0) {
              setBases(dataCache.bases);
            }
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
      setDictForm(prev => {
        const newExtraData = { ...prev.extra_data, [extraKey]: value };
        return {
          ...prev,
          extra_data: newExtraData
        };
      });
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
      if (field.key === 'is_enabled') {
        defaultExtraData[field.key] = 'true';
      } else if (field.key === 'level') {
        defaultExtraData[field.key] = '1'; // 默认层级为1
      } else {
        defaultExtraData[field.key] = field.type === 'number' ? 0 : '';
      }
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
    setFormErrors(prev => ({ ...prev, dict: '' }));
  };

  // 提交数据字典表单
  const handleDictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleDictSubmit 被调用, editingItem:', editingItem);
    setIsLoading(true);
    setFormErrors(prev => ({ ...prev, dict: '' }));

    try {
      // 校验巡查次数配置的季度分解总和
      if (dictionaryType === 'inspection_config') {
        const { plan_count, quarterly_breakdown, Q1, Q2, Q3, Q4 } = dictForm.extra_data;
        if (quarterly_breakdown === '按季度配置') {
          const total = Number(Q1) + Number(Q2) + Number(Q3) + Number(Q4);
          if (total !== Number(plan_count)) {
            const errorMsg = '季度分解总和必须等于计划巡查次数';
            showToast('error', errorMsg);
            setIsLoading(false);
            return;
          }
        }
      }

      // 校验基站编号是否重复
      if (dictionaryType === 'base_station' && !editingItem) {
        // 重新获取最新的基站数据进行校验
        const latestItems = await getDictionaryItems('base_station');
        const existingItem = latestItems.find(item => item.code === dictForm.code);
        if (existingItem) {
          const errorMsg = '基站编号已存在，不能重复添加';
          showToast('error', errorMsg);
          setIsLoading(false);
          return;
        }
      }

      // 校验污染源类型编号和名称是否重复
      if (dictionaryType === 'pollution_type') {
        // 重新获取最新的污染源类型数据进行校验
        const latestItems = await getDictionaryItems('pollution_type');

        // 检查编号是否重复
        const existingCodeItem = latestItems.find(item => item.code === dictForm.code && item.id !== editingItem?.id);
        if (existingCodeItem) {
          const errorMsg = '污染源类型编号已存在，不能重复添加';
          showToast('error', errorMsg);
          setIsLoading(false);
          return;
        }

        // 检查名称是否重复
        const existingNameItem = latestItems.find(item => item.name === dictForm.name && item.id !== editingItem?.id);
        if (existingNameItem) {
          const errorMsg = '污染源类型名称已存在，不能重复添加';
          showToast('error', errorMsg);
          setIsLoading(false);
          return;
        }
      }

      // 清理 extra_data 中的空值（将空字符串转为 null，方便后端处理）
      const cleanedExtraData: Record<string, any> = {};
      for (const [key, value] of Object.entries(dictForm.extra_data)) {
        cleanedExtraData[key] = value === '' ? null : value;
      }

      if (editingItem) {
        await updateDictionaryItem(editingItem.id, {
          code: dictForm.code,
          name: dictForm.name,
          description: dictForm.description,
          extra_data: cleanedExtraData,
          sort_order: dictForm.sort_order
        });
        // 记录更新日志
        if (currentUser) {
          console.log('准备记录更新日志, currentUser:', currentUser);
          try {
            const logResult = await createOperationLog({
              user_id: currentUser.id,
              username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
              action_type: 'UPDATE',
              target_type: dictionaryType === 'inspection_config' ? 'INSPECTION_CONFIG' : 'DICTIONARY',
              target_id: editingItem.id,
              target_name: dictForm.name,
              description: `更新数据字典项 (类型: ${dictionaryTypeConfig[dictionaryType].name})`
            });
            console.log('操作日志记录成功:', logResult);
          } catch (logError) {
            console.error('记录操作日志失败:', logError);
          }
        }
      } else {
        const result = await createDictionaryItem({
          type: dictionaryType,
          code: dictForm.code,
          name: dictForm.name,
          description: dictForm.description,
          extra_data: cleanedExtraData,
          sort_order: dictForm.sort_order,
          is_active: true
        });
        // 记录创建日志
        if (currentUser) {
          try {
            await createOperationLog({
              user_id: currentUser.id,
              username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
              action_type: 'CREATE',
              target_type: dictionaryType === 'inspection_config' ? 'INSPECTION_CONFIG' : 'DICTIONARY',
              target_id: result?.id || null,
              target_name: dictForm.name,
              description: `创建数据字典项 (类型: ${dictionaryTypeConfig[dictionaryType].name})`
            });
          } catch (logError) {
            console.error('记录操作日志失败:', logError);
          }
        }
      }
      // 清除对应字典类型的缓存，确保重新从数据库加载数据
      setDataCache(prev => {
        const newDictionary = { ...prev.dictionary };
        delete newDictionary[dictionaryType];
        // 如果是覆盖范围，还需要清除相关的缓存
        if (dictionaryType === 'coverage_area') {
          delete newDictionary['route'];
          return {
            ...prev,
            dictionary: newDictionary,
            bases: [],
            basesMap: {},
            routes: {},
            routesMap: {}
          };
        }
        return {
          ...prev,
          dictionary: newDictionary
        };
      });
      loadData();
      setShowForm(false);
      resetDictForm();
    } catch (err: any) {
      const errorMsg = err.message || '保存数据失败';
      showToast('error', errorMsg);
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
    setUserForm({ username: '', password: '', role: '', description: '', contact_info: '' });
  };

  // 编辑项目
  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'users') {
      setUserForm({
        username: item.username || '',
        password: '',
        role: item.role || '',
        description: item.description || '',
        contact_info: item.contact_info || ''
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
          // 记录删除日志
          if (currentUser) {
            try {
              await createOperationLog({
                user_id: currentUser.id,
                username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
                action_type: 'DELETE',
                target_type: dictionaryType === 'inspection_config' ? 'INSPECTION_CONFIG' : 'DICTIONARY',
                target_id: id,
                description: `删除数据字典项 (类型: ${dictionaryType})`
              });
            } catch (logError) {
              console.error('记录操作日志失败:', logError);
            }
          }
          break;
        case 'users':
          await deleteUser(id);
          // 记录删除日志
          if (currentUser) {
            try {
              await createOperationLog({
                user_id: currentUser.id,
                username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
                action_type: 'DELETE',
                target_type: 'USER',
                target_id: id,
                description: '删除用户'
              });
            } catch (logError) {
              console.error('记录操作日志失败:', logError);
            }
          }
          break;
        case 'roles':
          await deleteRole(id);
          // 记录删除日志
          if (currentUser) {
            try {
              await createOperationLog({
                user_id: currentUser.id,
                username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
                action_type: 'DELETE',
                target_type: 'ROLE',
                target_id: id,
                description: '删除角色'
              });
            } catch (logError) {
              console.error('记录操作日志失败:', logError);
            }
          }
          break;
      }
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || '删除数据失败';
      setError(errorMsg);
      showToast('error', errorMsg);
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
      const errorMsg = err.message || '重置密码失败';
      setError(errorMsg);
      showToast('error', errorMsg);
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
      const errorMsg = err.message || '删除角色失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 提交角色表单
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        await updateRole(editingItem.id, roleForm);
        // 记录更新日志
        if (currentUser) {
          try {
            await createOperationLog({
              user_id: currentUser.id,
              username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
              action_type: 'UPDATE',
              target_type: 'ROLE',
              target_id: editingItem.id,
              target_name: roleForm.name,
              description: '更新角色信息'
            });
          } catch (logError) {
            console.error('记录操作日志失败:', logError);
          }
        }
      } else {
        await createRole(roleForm);
        // 记录创建日志
        if (currentUser) {
          try {
            await createOperationLog({
              user_id: currentUser.id,
              username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'unknown',
              action_type: 'CREATE',
              target_type: 'ROLE',
              target_name: roleForm.name,
              description: '创建新角色'
            });
          } catch (logError) {
            console.error('记录操作日志失败:', logError);
          }
        }
      }
      loadData();
      setShowForm(false);
      resetRoleForm();
      setEditingItem(null);
    } catch (err: any) {
      const errorMsg = err.message || (editingItem ? '更新角色失败' : '新增角色失败');
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        // 编辑时不传递 password 字段
        const { password, ...userDataWithoutPassword } = userForm;
        await updateUser(editingItem.id, userDataWithoutPassword);
      } else {
        await addUser(userForm.username, userForm.password, userForm.description, userForm.role, userForm.contact_info);
      }
      loadData();
      setShowForm(false);
      resetUserForm();
      setEditingItem(null);
    } catch (err: any) {
      const errorMsg = err.message || (editingItem ? '更新用户失败' : '新增用户失败');
      showToast('error', errorMsg);
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
            sort_order: parseInt(sortOrder) || 0,
            type: dictionaryType
          };
        }).filter(item => item.name);

        await importDictionaryData(dictionaryType, data);
        loadData();
      };
      reader.readAsText(file);
    } catch (err: any) {
      const errorMsg = err.message || '导入数据失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      await exportDictionaryData(dictionaryType);
    } catch (err: any) {
      const errorMsg = err.message || '导出数据失败';
      setError(errorMsg);
      showToast('error', errorMsg);
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
                <label htmlFor="name">角色名称<span className="required-mark">*</span></label>
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
                <label htmlFor="code">角色代码<span className="required-mark">*</span></label>
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

  // 渲染数据字典表单
  const renderDictionaryForm = () => {
    const config = dictionaryTypeConfig[dictionaryType];

    return (
      <>
        <div className="drawer-overlay" onClick={() => {
          setShowForm(false);
          resetDictForm();
          setEditingItem(null);
        }} />
        <div className="drawer">
          <div className="drawer-header">
            <h3>{editingItem ? '编辑' : '添加'}{config.name}</h3>
            <button
              type="button"
              className="drawer-close"
              onClick={() => {
                setShowForm(false);
                resetDictForm();
                setEditingItem(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="drawer-body">
            <form onSubmit={handleDictSubmit} id="dict-form">
              <div className="grid grid-cols-2 gap-4">
                {dictionaryType !== 'inspection_config' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="code">{dictionaryType === 'base_station' ? '基站编码' : dictionaryType === 'route' ? '航线编码' : dictionaryType === 'coverage_area' ? '区域编码' : dictionaryType === 'responsible_unit' ? '单位编码' : dictionaryType === 'pollution_type' ? '类型编码' : '代码'}<span className="required-mark">*</span></label>
                      <input
                        type="text"
                        id="code"
                        name="code"
                        value={dictForm.code}
                        onChange={handleDictChange}
                        required
                        pattern={dictionaryType === 'base_station' ? '[A-Z0-9]{2,6}' : undefined}
                        title={dictionaryType === 'base_station' ? '2-6位大写字母/数字' : undefined}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="name">{dictionaryType === 'base_station' ? '基站名称' : dictionaryType === 'route' ? '航线名称' : dictionaryType === 'coverage_area' ? '区域名称' : dictionaryType === 'responsible_unit' ? '单位名称' : dictionaryType === 'pollution_type' ? '类型名称' : '名称'}<span className="required-mark">*</span></label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={dictForm.name}
                        onChange={handleDictChange}
                        required
                        maxLength={dictionaryType === 'base_station' ? 50 : undefined}
                      />
                    </div>
                  </>
                )}
                {dictionaryType === 'inspection_config' && (
                  <input
                    type="hidden"
                    id="code"
                    name="code"
                    value={dictForm.code || `INS_${Date.now()}`}
                    onChange={handleDictChange}
                  />
                )}
                {dictionaryType === 'inspection_config' && (
                  <input
                    type="hidden"
                    id="name"
                    name="name"
                    value={dictForm.name || `巡查配置_${Date.now()}`}
                    onChange={handleDictChange}
                  />
                )}

                {config.extraFields.map(field => {
                  const isRequired = ['base_station_id', 'route_id', 'area_id', 'unit_type', 'is_enabled', 'year', 'object_type', 'object_id', 'plan_count', 'quarterly_breakdown', 'Q1', 'Q2', 'Q3', 'Q4'].includes(field.key);
                  return (
                    <div className="form-group" key={field.key}>
                      <label htmlFor={`extra_${field.key}`}>
                        {field.label}{isRequired && <span className="required-mark">*</span>}
                      </label>
                      {field.key === 'base_station_id' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: bases.find(b => b.id === dictForm.extra_data[field.key])?.name || '' } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                          setSelectedBase(value);
                        }}
                        options={bases.filter(base => base.is_enabled).map(base => ({ value: base.id, label: base.name }))}
                        placeholder="请选择基站"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                    ) : field.key === 'route_id' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: routes.find(r => r.id === dictForm.extra_data[field.key])?.name || '' } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={routes.map(route => ({ value: route.id, label: route.name }))}
                        placeholder="请选择航线"
                        isClearable={true}
                        isSearchable={true}
                        required
                        isDisabled={!selectedBase && dictionaryType === 'coverage_area'}
                      />
                    ) : field.key === 'parent_id' && dictionaryType === 'coverage_area' ? (
                      <Cascader
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={(value, path) => {
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                          // 根据选中路径的长度设置层级
                          const level = path.length;
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value, level }
                          }));
                        }}
                        placeholder="请选择上级区域"
                        getData={getChildRegions}
                        searchRegions={searchRegions}
                      />
                    ) : field.key === 'parent_id' && dictionaryType === 'pollution_type' ? (
                      <Cascader
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={(value) => {
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        placeholder="请选择上级类型"
                        searchPlaceholder="搜索上级类型"
                        getData={(parentId) => getChildPollutionTypes(parentId, pollutionTypes.filter(item => {
                          // 排除当前编辑的项目
                          if (editingItem && item.id === editingItem.id) {
                            return false;
                          }
                          return true;
                        }))}
                        searchRegions={(keyword) => searchPollutionTypes(keyword, pollutionTypes.filter(item => {
                          // 排除当前编辑的项目
                          if (editingItem && item.id === editingItem.id) {
                            return false;
                          }
                          return true;
                        }))}
                      />
                    ) : field.key === 'parent_id' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: areas.find(a => a.id === dictForm.extra_data[field.key])?.name || '' } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={areas.map(area => ({ value: area.id, label: area.name }))}
                        placeholder="请选择上级区域"
                        isClearable={true}
                        isSearchable={false}
                      />
                    ) : field.key === 'area_id' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: areas.find(a => a.id === dictForm.extra_data[field.key])?.name || '' } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={areas.filter(area => area.is_active).map(area => ({ value: area.id, label: area.name }))}
                        placeholder="请选择所属区域"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                    ) : field.key === 'unit_type' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: dictForm.extra_data[field.key] === 'internal' ? '内部' : '外部' } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={[
                          { value: 'internal', label: '内部' },
                          { value: 'external', label: '外部' }
                        ]}
                        placeholder="请选择单位类型"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                    ) : field.key === 'parent_id' && dictionaryType === 'pollution_type' ? (
                      <Cascader
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={(value) => {
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        placeholder="请选择上级类型"
                        searchPlaceholder="搜索上级类型"
                        getData={(parentId) => getChildPollutionTypes(parentId, pollutionTypes)}
                        searchRegions={(keyword) => searchPollutionTypes(keyword, pollutionTypes)}
                      />
                    ) : field.key === 'severity' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: dictForm.extra_data[field.key] } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={[
                          { value: '高', label: '高' },
                          { value: '中', label: '中' },
                          { value: '低', label: '低' }
                        ]}
                        placeholder="请选择严重程度默认值"
                        isClearable={true}
                        isSearchable={false}
                      />
                    ) : field.key === 'object_type' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: dictForm.extra_data[field.key] } : null}
                        onChange={(option: any) => {
                          const value = option?.value || '';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value, object_id: '' }
                          }));
                        }}
                        options={[
                          { value: '个人', label: '个人' },
                          { value: '基站', label: '基站' }
                        ]}
                        placeholder="请选择配置对象类型"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                    ) : field.key === 'object_id' ? (
                      <>
                        {dictForm.extra_data.object_type === '部门' ? (
                          <input
                            type="number"
                            id={`extra_${field.key}`}
                            name={`extra_${field.key}`}
                            value={dictForm.extra_data[field.key] || ''}
                            onChange={handleDictChange}
                            required
                            placeholder="请输入部门ID"
                          />
                        ) : dictForm.extra_data.object_type === '个人' ? (
                          <Select
                            id={`extra_${field.key}`}
                            name={`extra_${field.key}`}
                            value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: users.find(u => u.id === dictForm.extra_data[field.key])?.username || '' } : null}
                            onChange={(option: any) => {
                              const value = option?.value || '';
                              setDictForm(prev => ({
                                ...prev,
                                extra_data: { ...prev.extra_data, [field.key]: value }
                              }));
                            }}
                            options={users.map(user => ({ value: user.id, label: user.username }))}
                            placeholder="请选择用户"
                            isClearable={false}
                            isSearchable={false}
                            required
                          />
                        ) : dictForm.extra_data.object_type === '基站' ? (
                          <Select
                            id={`extra_${field.key}`}
                            name={`extra_${field.key}`}
                            value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: bases.find(b => b.id === dictForm.extra_data[field.key])?.name || '' } : null}
                            onChange={(option: any) => {
                              const value = option?.value || '';
                              setDictForm(prev => ({
                                ...prev,
                                extra_data: { ...prev.extra_data, [field.key]: value }
                              }));
                            }}
                            options={bases.map(base => ({ value: base.id, label: base.name }))}
                            placeholder="请选择基站"
                            isClearable={false}
                            isSearchable={false}
                            required
                          />
                        ) : (
                          <input
                            type="number"
                            id={`extra_${field.key}`}
                            name={`extra_${field.key}`}
                            value={dictForm.extra_data[field.key] || ''}
                            onChange={handleDictChange}
                            required
                            placeholder="请选择配置对象类型后再输入对象ID"
                            disabled
                          />
                        )}
                      </>
                    ) : field.key === 'year' ? (
                      <YearPicker
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={(value) => {
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        placeholder="请选择配置年份"
                        minYear={2020}
                        maxYear={2030}
                      />
                    ) : field.key === 'plan_count' ? (
                      <input
                        type="number"
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={(option: any) => {
                          const value = option?.target?.value || '';
                          let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
                          const breakdown = dictForm.extra_data.quarterly_breakdown || '平均分配';
                          if (breakdown === '平均分配' && value) {
                            const total = Number(value);
                            const avg = Math.floor(total / 4);
                            const remainder = total % 4;
                            q1 = avg + (remainder >= 1 ? 1 : 0);
                            q2 = avg + (remainder >= 2 ? 1 : 0);
                            q3 = avg + (remainder >= 3 ? 1 : 0);
                            q4 = avg;
                          }
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { 
                              ...prev.extra_data, 
                              [field.key]: value,
                              ...(breakdown === '平均分配' && {
                                Q1: q1,
                                Q2: q2,
                                Q3: q3,
                                Q4: q4
                              })
                            }
                          }));
                        }}
                        required
                        min="1"
                        placeholder="全年计划总次数"
                      />
                    ) : field.key === 'quarterly_breakdown' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: dictForm.extra_data[field.key] } : { value: '平均分配', label: '平均分配' }}
                        onChange={(option: any) => {
                          const value = option?.value || '平均分配';
                          let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
                          if (value === '平均分配' && dictForm.extra_data.plan_count) {
                            const total = Number(dictForm.extra_data.plan_count);
                            const avg = Math.floor(total / 4);
                            const remainder = total % 4;
                            q1 = avg + (remainder >= 1 ? 1 : 0);
                            q2 = avg + (remainder >= 2 ? 1 : 0);
                            q3 = avg + (remainder >= 3 ? 1 : 0);
                            q4 = avg;
                          }
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { 
                              ...prev.extra_data, 
                              [field.key]: value,
                              Q1: q1,
                              Q2: q2,
                              Q3: q3,
                              Q4: q4
                            }
                          }));
                        }}
                        options={[
                          { value: '平均分配', label: '平均分配' },
                          { value: '按季度配置', label: '按季度配置' }
                        ]}
                        placeholder="请选择季度分解方式"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                    ) : (field.key === 'Q1' || field.key === 'Q2' || field.key === 'Q3' || field.key === 'Q4') ? (
                      dictForm.extra_data.quarterly_breakdown === '按季度配置' ? (
                        <input
                          type="number"
                          id={`extra_${field.key}`}
                          name={`extra_${field.key}`}
                          value={dictForm.extra_data[field.key] || ''}
                          onChange={handleDictChange}
                          required
                          min="0"
                          placeholder={`请输入${field.key}季度次数`}
                        />
                      ) : (
                        <input
                          type="number"
                          id={`extra_${field.key}`}
                          name={`extra_${field.key}`}
                          value={dictForm.extra_data[field.key] || ''}
                          onChange={handleDictChange}
                          disabled
                          placeholder="请输入计划巡检次数"
                        />
                      )
                    ) : field.key === 'remark' ? (
                      <textarea
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={handleDictChange}
                        rows={3}
                        placeholder="请输入备注"
                      />
                    ) : field.key === 'is_enabled' ? (
                      <Select
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] ? { value: dictForm.extra_data[field.key], label: dictForm.extra_data[field.key] === 'true' ? '启用' : '禁用' } : { value: 'true', label: '启用' }}
                        onChange={(option: any) => {
                          const value = option?.value || 'true';
                          setDictForm(prev => ({
                            ...prev,
                            extra_data: { ...prev.extra_data, [field.key]: value }
                          }));
                        }}
                        options={[
                          { value: 'true', label: '启用' },
                          { value: 'false', label: '禁用' }
                        ]}
                        placeholder="请选择状态"
                        isClearable={true}
                        isSearchable={true}
                        required
                      />
                      ) : field.key === 'phone' ? (
                        <input
                          type="tel"
                          id={`extra_${field.key}`}
                          name={`extra_${field.key}`}
                          value={dictForm.extra_data[field.key] || ''}
                          onChange={handleDictChange}
                          placeholder="请输入手机号或固定电话"
                        />
                      ) : field.key === 'email' ? (
                        <input
                          type="email"
                          id={`extra_${field.key}`}
                          name={`extra_${field.key}`}
                          value={dictForm.extra_data[field.key] || ''}
                          onChange={handleDictChange}
                          placeholder="请输入电子邮箱"
                          pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                        />
                      ) : field.key === 'contact_phone' ? (
                        <input
                          type="tel"
                          id={`extra_${field.key}`}
                          name={`extra_${field.key}`}
                          value={dictForm.extra_data[field.key] || ''}
                          onChange={handleDictChange}
                          placeholder="请输入手机号"
                          pattern="1[3-9]\d{9}"
                        />
                      ) : field.type === 'number' ? (
                      <input
                        type="number"
                        id={`extra_${field.key}`}
                        name={`extra_${field.key}`}
                        value={dictForm.extra_data[field.key] || ''}
                        onChange={handleDictChange}
                        min="1"
                        max="3"
                        step="1"
                        disabled
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
                  );
                })}

                {dictionaryType !== 'inspection_config' && (
                  <>
                    {![
                      'coverage_area',
                      'responsible_unit',
                      'pollution_type',
                      'base_station',
                      'route'
                    ].includes(dictionaryType) && (
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
                    )}

                    {![
                      'coverage_area',
                      'responsible_unit',
                      'pollution_type',
                      'base_station',
                      'route'
                    ].includes(dictionaryType) && (
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
                    )}
                  </>
                )}
                {dictionaryType === 'inspection_config' && (
                  <input
                    type="hidden"
                    id="sort_order"
                    name="sort_order"
                    value={dictForm.sort_order || 0}
                    onChange={handleDictChange}
                  />
                )}
                {dictionaryType === 'inspection_config' && (
                  <input
                    type="hidden"
                    id="description"
                    name="description"
                    value={dictForm.description || ''}
                    onChange={handleDictChange}
                  />
                )}
              </div>
            </form>
          </div>
          <div className="drawer-footer">
            <div className="form-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  resetDictForm();
                }}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                form="dict-form"
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
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
        </div>
      </>
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
                <label htmlFor="username">用户名<span className="required-mark">*</span></label>
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
                  <label htmlFor="password">密码<span className="required-mark">*</span></label>
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
                <label htmlFor="role">角色<span className="required-mark">*</span></label>
                <div style={{ height: '42px' }}>
                  <Select
                    id="role"
                    name="role"
                    value={userForm.role ? { value: userForm.role, label: userForm.role === 'admin' ? '管理员' : userForm.role === 'user' ? '普通用户' : '查看者' } : null}
                    onChange={(option: any) => {
                      setUserForm(prev => ({ ...prev, role: option?.value || '' }));
                    }}
                    options={[
                      { value: 'admin', label: '管理员' },
                      { value: 'user', label: '普通用户' },
                      { value: 'viewer', label: '查看者' }
                    ]}
                    placeholder="选择角色"
                    isClearable={false}
                    isSearchable={false}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact_info">联系方式</label>
                <input
                  type="text"
                  id="contact_info"
                  name="contact_info"
                  value={userForm.contact_info}
                  onChange={handleUserChange}
                  placeholder="电话号码"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">描述</label>
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
    } else if (activeTab === 'operation_logs') {
      return renderOperationLogList();
    }
    return renderDictionaryList();
  };

  // 渲染用户列表
  const renderUserList = () => {
    const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);
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
            {canManageUsers && (
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                新增用户
              </button>
            )}
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
                <th>联系方式</th>
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
                  <td>{user.contact_info || '-'}</td>
                  <td>
                    <span className={`tag tag-${user.role === 'admin' ? 'success' : user.role === 'user' ? 'info' : 'warning'}`}>
                      {user.role === 'admin' ? '管理员' : user.role === 'user' ? '普通用户' : '查看者'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                      {canManageUsers && (
                        <>
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
                        </>
                      )}
                      {!canManageUsers && <span className="text-muted" style={{ color: '#999', fontSize: '0.85rem' }}>无权限</span>}
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
    const canManageRoles = hasPermission(PERMISSIONS.ROLES_MANAGE);
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
            {canManageRoles && (
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', fontWeight: '500', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                新增角色
              </button>
            )}
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
                      {canManageRoles && (
                        <>
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
                        </>
                      )}
                      {!canManageRoles && <span className="text-muted" style={{ color: '#999', fontSize: '0.85rem' }}>无权限</span>}
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

  // 展开/折叠状态管理
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 切换展开/折叠状态
  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 渲染树形节点
  const renderTreeNode = (items: any[], level: number = 0, canWriteSettings: boolean = false) => {
    return items.map(item => {
      const hasChildren = dictionaryItems.some(child => child.extra_data?.parent_id === item.id);
      const isExpanded = expandedNodes.has(item.id);
      const children = isExpanded ? dictionaryItems.filter(child => child.extra_data?.parent_id === item.id) : [];

      return (
        <React.Fragment key={item.id}>
          <tr style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: level > 0 ? '#f9f9f9' : '#ffffff' }}>
            <td style={{ paddingLeft: `${level * 30}px`, borderLeft: level > 0 ? '3px solid #e0e0e0' : 'none' }}>
              {hasChildren && (
                <span
                  style={{
                    cursor: 'pointer',
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    textAlign: 'center',
                    marginRight: '12px',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: '#4CAF50',
                    fontWeight: 'bold'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id);
                  }}
                >
                  ▶
                </span>
              )}
              <span style={{ fontSize: level > 0 ? '0.95rem' : '1rem', fontWeight: level > 0 ? 'normal' : '500' }}>{item.code}</span>
            </td>
            <td style={{ fontSize: level > 0 ? '0.95rem' : '1rem', fontWeight: level > 0 ? 'normal' : '500' }}>{item.name}</td>
            {filteredExtraFields.map((field: any) => (
              <td key={field.key}>
                {field.key === 'base_station_id' && item.extra_data?.base_station_id
                          ? dataCache.basesMap[item.extra_data?.base_station_id]?.name || item.extra_data?.base_station_id
                          : field.key === 'route_id' && item.extra_data?.route_id && selectedBase
                            ? dataCache.routesMap[selectedBase]?.[item.extra_data?.route_id]?.name || item.extra_data?.route_id
                            : field.key === 'area_id' && item.extra_data?.area_id && selectedBase
                              ? dataCache.routesMap[selectedBase]?.[item.extra_data?.area_id]?.name || item.extra_data?.area_id
                              : field.key === 'parent_id' && item.extra_data?.parent_id
                                ? dictionaryType === 'coverage_area'
                                  ? getRegionPath(item.extra_data?.parent_id) || item.extra_data?.parent_id
                                  : dataCache.pollutionTypesMap[item.extra_data?.parent_id]?.name || item.extra_data?.parent_id
                                : field.key === 'unit_type'
                                  ? item.extra_data?.unit_type === 'internal' ? '内部' : '外部'
                                  : field.key === 'severity'
                                    ? item.extra_data?.severity || '-'
                                    : field.key === 'is_enabled'
                                      ? item.extra_data?.is_enabled === 'true' ? '启用' : '禁用'
                                      : field.key === 'object_id' && item.extra_data?.object_id && item.extra_data?.object_type
                                        ? item.extra_data?.object_type === '个人'
                                          ? dataCache.usersMap[item.extra_data?.object_id]?.username || item.extra_data?.object_id
                                          : item.extra_data?.object_type === '基站'
                                            ? dataCache.basesMap[item.extra_data?.object_id]?.name || item.extra_data?.object_id
                                            : item.extra_data?.object_id
                                        : field.key === 'quarterly_breakdown'
                                          ? item.extra_data?.quarterly_breakdown || '平均分配'
                                          : item.extra_data?.[field.key] || '-'}
              </td>
            ))}
            <td>
              <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                {canWriteSettings ? (
                  <>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleEdit(item)}
                      style={{ whiteSpace: 'nowrap', margin: 0 }}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(item.id)}
                      style={{ whiteSpace: 'nowrap', margin: 0 }}
                    >
                      删除
                    </button>
                  </>
                ) : (
                  <span className="text-muted" style={{ color: '#999', fontSize: '0.85rem' }}>无权限</span>
                )}
              </div>
            </td>
          </tr>
          {children.length > 0 && renderTreeNode(children, level + 1, canWriteSettings)}
        </React.Fragment>
      );
    });
  };

  // 渲染数据字典列表
  const renderDictionaryList = () => {
    const config = dictionaryTypeConfig[dictionaryType];
    const canWriteSettings = hasPermission(PERMISSIONS.SETTINGS_WRITE);

    return (
      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333333', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '2px' }}></span>
              {dictionaryType === 'base_station' ? '基站' : dictionaryType === 'route' ? '航线' : config.name}列表
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            {canWriteSettings && (
              <>
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
              </>
            )}
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
                {dictionaryType !== 'inspection_config' && (
                  <>
                    <th>{dictionaryType === 'base_station' ? '基站编码' : dictionaryType === 'route' ? '航线编码' : dictionaryType === 'coverage_area' ? '区域编码' : dictionaryType === 'responsible_unit' ? '单位编码' : dictionaryType === 'pollution_type' ? '类型编码' : '代码'}</th>
                    <th>{dictionaryType === 'base_station' ? '基站名称' : dictionaryType === 'route' ? '航线名称' : dictionaryType === 'coverage_area' ? '区域名称' : dictionaryType === 'responsible_unit' ? '单位名称' : dictionaryType === 'pollution_type' ? '类型名称' : '名称'}</th>
                  </>
                )}
                {filteredExtraFields.map(field => (
                  <th key={field.key}>{field.label}</th>
                ))}
                {dictionaryType !== 'inspection_config' && (
                  <>
                    {![
                      'coverage_area',
                      'responsible_unit',
                      'pollution_type',
                      'base_station',
                      'route'
                    ].includes(dictionaryType) && (
                      <th>描述</th>
                    )}
                    {![
                      'coverage_area',
                      'responsible_unit',
                      'pollution_type',
                      'base_station',
                      'route'
                    ].includes(dictionaryType) && (
                      <th>排序</th>
                    )}
                  </>
                )}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {(dictionaryType === 'coverage_area' || dictionaryType === 'pollution_type') ? (
                renderTreeNode(rootNodes, 0, canWriteSettings)
              ) : (
                dictionaryItems.map(item => (
                  <tr key={item.id}>
                    {dictionaryType !== 'inspection_config' && (
                <>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                </>
              )}
                    {filteredExtraFields.map(field => (
                      <td key={field.key}>
                        {field.key === 'base_station_id' && item.extra_data?.base_station_id
                          ? dataCache.basesMap[item.extra_data?.base_station_id]?.name || item.extra_data?.base_station_id
                          : field.key === 'route_id' && item.extra_data?.route_id && selectedBase
                            ? dataCache.routesMap[selectedBase]?.[item.extra_data?.route_id]?.name || item.extra_data?.route_id
                            : field.key === 'area_id' && item.extra_data?.area_id
                              ? dataCache.areasMap[item.extra_data?.area_id]?.name || item.extra_data?.area_id
                              : field.key === 'parent_id' && item.extra_data?.parent_id
                                ? dataCache.pollutionTypesMap[item.extra_data?.parent_id]?.name || item.extra_data?.parent_id
                                : field.key === 'unit_type'
                                  ? item.extra_data?.unit_type === 'internal' ? '内部' : '外部'
                                  : field.key === 'severity'
                                    ? item.extra_data?.severity || '-'
                                    : field.key === 'is_enabled'
                                      ? item.extra_data?.is_enabled === 'true' ? '启用' : '禁用'
                                      : field.key === 'object_id' && item.extra_data?.object_id && item.extra_data?.object_type
                                        ? item.extra_data?.object_type === '个人'
                                          ? dataCache.usersMap[item.extra_data?.object_id]?.username || item.extra_data?.object_id
                                          : item.extra_data?.object_type === '基站'
                                            ? dataCache.basesMap[item.extra_data?.object_id]?.name || item.extra_data?.object_id
                                            : item.extra_data?.object_id
                                        : field.key === 'quarterly_breakdown'
                                          ? item.extra_data?.quarterly_breakdown || '平均分配'
                                          : item.extra_data?.[field.key] || '-'}
                      </td>
                    ))}
                    {dictionaryType !== 'inspection_config' && (
                      <>
                        {![
                          'coverage_area',
                          'responsible_unit',
                          'pollution_type',
                          'base_station',
                          'route'
                        ].includes(dictionaryType) && (
                          <td>{item.description || '-'}</td>
                        )}
                        {![
                          'coverage_area',
                          'responsible_unit',
                          'pollution_type',
                          'base_station',
                          'route'
                        ].includes(dictionaryType) && (
                          <td>{item.sort_order || 0}</td>
                        )}
                      </>
                    )}
                    <td>
                      <div className="btn-group" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        {canWriteSettings ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEdit(item)}
                              style={{ whiteSpace: 'nowrap', margin: 0 }}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => item.id && handleDelete(item.id)}
                              style={{ whiteSpace: 'nowrap', margin: 0 }}
                            >
                              删除
                            </button>
                          </>
                        ) : (
                          <span className="text-muted" style={{ color: '#999', fontSize: '0.85rem' }}>无权限</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // 加载操作日志
  const loadOperationLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // 处理日期格式，将 YYYY-MM-DD 转换为完整的 datetime 格式
      const formatStartDate = (dateStr: string | undefined) => {
        if (!dateStr) return undefined;
        // 开始日期设置为当天的 00:00:00
        if (dateStr.includes('-')) {
          return dateStr + 'T00:00:00';
        }
        return dateStr;
      };

      const formatEndDate = (dateStr: string | undefined) => {
        if (!dateStr) return undefined;
        // 结束日期设置为当天的 23:59:59
        if (dateStr.includes('-')) {
          return dateStr + 'T23:59:59';
        }
        return dateStr;
      };

      const result = await getOperationLogs({
        username: operationLogsFilter.username || undefined,
        action_type: operationLogsFilter.action_type || undefined,
        target_type: operationLogsFilter.target_type || undefined,
        start_date: formatStartDate(operationLogsFilter.start_date),
        end_date: formatEndDate(operationLogsFilter.end_date),
        limit: operationLogsPageSize,
        offset: (operationLogsPage - 1) * operationLogsPageSize
      });
      setOperationLogs(result.logs);
      setOperationLogsTotal(result.total);
    } catch (err: any) {
      const errorMsg = err.message || '加载操作日志失败';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [operationLogsFilter, operationLogsPage, operationLogsPageSize]);

  // 操作日志分页变化时重新加载
  useEffect(() => {
    if (activeTab === 'operation_logs') {
      loadOperationLogs();
    }
  }, [activeTab, operationLogsPage, operationLogsPageSize]);

  // 渲染操作日志列表
  const renderOperationLogList = () => {
    return (
      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#ffffff', borderBottom: '2px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#333333', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '2px' }}></span>
              操作日志
            </h3>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="dictionary-tabs" style={{ marginBottom: '16px', borderBottom: '1px solid #e0e0e0', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <input
                type="text"
                placeholder="用户名"
                value={operationLogsFilter.username}
                onChange={(e) => setOperationLogsFilter(prev => ({ ...prev, username: e.target.value }))}
                style={{ width: '150px', height: '42px', padding: '0 12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <Select
                value={operationLogsFilter.action_type ? { value: operationLogsFilter.action_type, label: getActionTypeOptions().find(opt => opt.value === operationLogsFilter.action_type)?.label || '' } : null}
                onChange={(option: any) => setOperationLogsFilter(prev => ({ ...prev, action_type: option?.value || '' }))}
                options={getActionTypeOptions()}
                placeholder="全部操作"
                isClearable={false}
                isSearchable={false}
                styles={{
                  container: (base) => ({ ...base, width: '180px', minWidth: '180px' }),
                  singleValue: (base) => ({ ...base, position: 'absolute', top: '50%', transform: 'translateY(-50%)', margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto' }}>
              <Select
                value={operationLogsFilter.target_type ? { value: operationLogsFilter.target_type, label: getTargetTypeOptions().find(opt => opt.value === operationLogsFilter.target_type)?.label || '' } : null}
                onChange={(option: any) => setOperationLogsFilter(prev => ({ ...prev, target_type: option?.value || '' }))}
                options={getTargetTypeOptions()}
                placeholder="全部目标"
                isClearable={false}
                isSearchable={false}
                styles={{
                  container: (base) => ({ ...base, width: '180px', minWidth: '180px' }),
                  singleValue: (base) => ({ ...base, position: 'absolute', top: '50%', transform: 'translateY(-50%)', margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '0 0 auto', width: '320px' }}>
              <DateRangePicker
                startDate={operationLogsFilter.start_date}
                endDate={operationLogsFilter.end_date}
                onChange={(startDate, endDate) => setOperationLogsFilter(prev => ({ ...prev, start_date: startDate, end_date: endDate }))}
                placeholder="请选择日期范围"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={loadOperationLogs}
              style={{ fontSize: '0.85rem', padding: '10px 18px', borderRadius: '6px', fontWeight: '500', height: '42px', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              查询
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setOperationLogsFilter({ username: '', action_type: '', target_type: '', start_date: '', end_date: '' });
                setOperationLogsPage(1);
                loadOperationLogs();
              }}
              style={{ fontSize: '0.85rem', padding: '10px 18px', borderRadius: '6px', fontWeight: '500', height: '42px', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              重置
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span className="loading-text">加载中...</span>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>操作类型</th>
                  <th>目标类型</th>
                  <th>目标名称</th>
                  <th>操作描述</th>
                  <th>操作时间</th>
                </tr>
              </thead>
              <tbody>
                {operationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      暂无操作日志
                    </td>
                  </tr>
                ) : (
                  operationLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.username}</td>
                      <td>
                        <span className={`tag tag-${
                          log.action_type === 'CREATE' ? 'success' :
                          log.action_type === 'UPDATE' ? 'info' :
                          log.action_type === 'DELETE' ? 'danger' :
                          log.action_type === 'LOGIN' ? 'primary' :
                          log.action_type === 'LOGOUT' ? 'secondary' :
                          log.action_type === 'RESET_PASSWORD' ? 'warning' : 'default'
                        }`}>
                          {getActionTypeOptions().find(opt => opt.value === log.action_type)?.label || log.action_type}
                        </span>
                      </td>
                      <td>{getTargetTypeOptions().find(opt => opt.value === log.target_type)?.label || log.target_type}</td>
                      <td>{log.target_name || '-'}</td>
                      <td>{log.description || '-'}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* 分页 */}
            {operationLogsTotal > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  共 {operationLogsTotal} 条记录
                </div>
                <div className="pagination-controls">
                  <Select
                    value={{ value: operationLogsPageSize, label: `${operationLogsPageSize}条/页` }}
                    onChange={(option: any) => {
                      setOperationLogsPageSize(Number(option.value));
                      setOperationLogsPage(1);
                    }}
                    options={[
                      { value: 10, label: '10条/页' },
                      { value: 20, label: '20条/页' },
                      { value: 50, label: '50条/页' },
                      { value: 100, label: '100条/页' }
                    ]}
                    placeholder="选择每页条数"
                    isClearable={false}
                    isSearchable={false}
                    className="custom-select"
                    styles={{
                      container: (base) => ({ ...base, width: '100px' }),
                      control: (base) => ({
                        ...base,
                        minHeight: '32px',
                        height: '32px',
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        padding: '0 8px',
                        height: '28px',
                      }),
                      input: (base) => ({
                        ...base,
                        margin: 0,
                        padding: 0,
                      }),
                      indicatorsContainer: (base) => ({
                        ...base,
                        height: '28px',
                      }),
                      dropdownIndicator: (base) => ({
                        ...base,
                        padding: '4px',
                      }),
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOperationLogsPage(p => Math.max(1, p - 1))}
                    disabled={operationLogsPage === 1}
                  >
                    上一页
                  </button>
                  <span className="pagination-page-info">
                    第 {operationLogsPage} 页 / 共 {Math.ceil(operationLogsTotal / operationLogsPageSize)} 页
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setOperationLogsPage(p => Math.min(Math.ceil(operationLogsTotal / operationLogsPageSize), p + 1))}
                    disabled={operationLogsPage >= Math.ceil(operationLogsTotal / operationLogsPageSize)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 如果没有权限访问任何标签页
  if (availableTabs.length === 0) {
    return (
      <div className="settings">
        <Navbar />
        <div className="main-content">
          <div className="container">
            <div className="no-permission" style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚫</div>
              <h3>无访问权限</h3>
              <p>您没有权限访问系统设置，请联系管理员</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      <Navbar />

      {/* 主内容 */}
      <div className="main-content">
        <div className="container">
          {/* 标签页 */}
          <div className="tabs">
            {(hasPermission(PERMISSIONS.USERS_READ) || hasPermission(PERMISSIONS.USERS_MANAGE)) && (
              <button
                className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                用户管理
              </button>
            )}
            {(hasPermission(PERMISSIONS.ROLES_READ) || hasPermission(PERMISSIONS.ROLES_MANAGE)) && (
              <button
                className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('roles')}
              >
                角色管理
              </button>
            )}
            {(hasPermission(PERMISSIONS.SETTINGS_READ) || hasPermission(PERMISSIONS.SETTINGS_WRITE)) && (
              <button
                className={`tab ${activeTab === 'dictionary' ? 'active' : ''}`}
                onClick={() => setActiveTab('dictionary')}
              >
                数据字典
              </button>
            )}
            {(hasPermission(PERMISSIONS.OPERATION_LOGS_READ) || hasPermission(PERMISSIONS.OPERATION_LOGS_MANAGE)) && (
              <button
                className={`tab ${activeTab === 'operation_logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('operation_logs')}
              >
                操作日志
              </button>
            )}
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
