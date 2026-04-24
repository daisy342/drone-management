import { supabase } from '../utils/supabase';

// 角色接口
export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  created_at?: string;
}

// 模拟角色数据（当数据库表不存在时使用）
const mockRoles: Role[] = [
  {
    id: '1',
    name: '管理员',
    code: 'admin',
    description: '系统管理员，拥有所有权限',
    permissions: ['all']
  },
  {
    id: '2',
    name: '普通用户',
    code: 'user',
    description: '普通用户，可进行日常操作',
    permissions: ['logs:read', 'logs:create', 'analysis:read']
  },
  {
    id: '3',
    name: '查看者',
    code: 'viewer',
    description: '仅可查看数据，无法修改',
    permissions: ['logs:read', 'analysis:read']
  }
];

// 获取所有角色
export const getAllRoles = async (): Promise<Role[]> => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('Could not find the table')) {
        return mockRoles;
      }
      throw new Error(`获取角色列表失败: ${error.message}`);
    }

    return data || mockRoles;
  } catch (error: any) {
    return mockRoles;
  }
};

// 创建角色
export const createRole = async (role: Omit<Role, 'id' | 'created_at'>): Promise<Role> => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert([{ ...role, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      throw new Error(`创建角色失败: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    throw error;
  }
};

// 更新角色
export const updateRole = async (roleId: string, roleData: Partial<Role>): Promise<Role> => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({ ...roleData, updated_at: new Date().toISOString() })
      .eq('id', roleId)
      .select();

    if (error) {
      throw new Error(`更新角色失败: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('更新角色失败: 未找到角色或更新失败');
    }

    return data[0];
  } catch (error: any) {
    throw error;
  }
};

// 删除角色
export const deleteRole = async (roleId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      throw new Error(`删除角色失败: ${error.message}`);
    }

    return true;
  } catch (error: any) {
    throw error;
  }
};

// 获取所有权限列表
export const getAllPermissions = (): { code: string; name: string; description: string }[] => {
  return [
    { code: 'all', name: '所有权限', description: '拥有系统的所有操作权限' },
    { code: 'logs:read', name: '查看日志', description: '可以查看飞行日志' },
    { code: 'logs:create', name: '创建日志', description: '可以创建新的飞行日志' },
    { code: 'logs:update', name: '编辑日志', description: '可以编辑已有的飞行日志' },
    { code: 'logs:delete', name: '删除日志', description: '可以删除飞行日志' },
    { code: 'analysis:read', name: '查看分析', description: '可以查看数据分析报表' },
    { code: 'analysis:export', name: '导出报表', description: '可以导出分析报表' },
    { code: 'settings:read', name: '查看设置', description: '可以查看系统设置' },
    { code: 'settings:write', name: '修改设置', description: '可以修改系统设置' },
    { code: 'users:read', name: '查看用户', description: '可以查看用户列表' },
    { code: 'users:manage', name: '管理用户', description: '可以创建、编辑、删除用户' },
    { code: 'roles:read', name: '查看角色', description: '可以查看角色列表' },
    { code: 'roles:manage', name: '管理角色', description: '可以创建、编辑、删除角色' }
  ];
};
