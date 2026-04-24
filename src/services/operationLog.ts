import { supabase } from '../utils/supabase';

// 操作类型
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'RESET_PASSWORD' | 'IMPORT' | 'EXPORT';

// 目标类型
export type TargetType = 'USER' | 'ROLE' | 'DICTIONARY' | 'LOG' | 'BASE_STATION' | 'ROUTE' | 'COVERAGE_AREA' | 'RESPONSIBLE_UNIT' | 'POLLUTION_TYPE' | 'INSPECTION_CONFIG';

// 操作日志
export interface OperationLog {
  id: string;
  user_id: string;
  username: string;
  action_type: OperationType;
  target_type: TargetType;
  target_id: string | null;
  target_name: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

// 查询参数
export interface OperationLogQueryParams {
  user_id?: string;
  username?: string;
  action_type?: OperationType;
  target_type?: TargetType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// 创建操作日志
export const createOperationLog = async ({
  user_id,
  username,
  action_type,
  target_type,
  target_id = null,
  target_name = null,
  old_values = null,
  new_values = null,
  description = null
}: {
  user_id: string;
  username: string;
  action_type: OperationType;
  target_type: TargetType;
  target_id?: string | null;
  target_name?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  description?: string | null;
}): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('create_operation_log', {
      p_user_id: user_id,
      p_username: username,
      p_action_type: action_type,
      p_target_type: target_type,
      p_target_id: target_id,
      p_target_name: target_name,
      p_old_values: old_values,
      p_new_values: new_values,
      p_description: description,
      p_ip_address: null // 可以从请求中获取
    });

    if (error) {
      throw error;
    }

    return data as string;
  } catch (error) {
    throw error;
  }
};

// 查询操作日志
export const getOperationLogs = async (params: OperationLogQueryParams = {}): Promise<{ logs: OperationLog[], total: number }> => {
  try {
    const {
      user_id,
      username,
      action_type,
      target_type,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = params;

    // 构建查询
    let query = supabase
      .from('operation_logs')
      .select('*', { count: 'exact' });

    // 添加过滤条件
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (username) {
      query = query.ilike('username', `%${username}%`);
    }
    if (action_type) {
      query = query.eq('action_type', action_type);
    }
    if (target_type) {
      query = query.eq('target_type', target_type);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // 排序和分页
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return {
      logs: (data || []) as OperationLog[],
      total: count || 0
    };
  } catch (error) {
    throw error;
  }
};

// 获取操作类型选项
export const getActionTypeOptions = () => [
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'LOGIN', label: '登录' },
  { value: 'LOGOUT', label: '登出' },
  { value: 'RESET_PASSWORD', label: '重置密码' },
  { value: 'IMPORT', label: '导入' },
  { value: 'EXPORT', label: '导出' }
];

// 获取目标类型选项
export const getTargetTypeOptions = () => [
  { value: 'USER', label: '用户' },
  { value: 'ROLE', label: '角色' },
  { value: 'DICTIONARY', label: '数据字典' },
  { value: 'BASE_STATION', label: '基站' },
  { value: 'ROUTE', label: '航线' },
  { value: 'COVERAGE_AREA', label: '覆盖范围' },
  { value: 'RESPONSIBLE_UNIT', label: '负责单位' },
  { value: 'POLLUTION_TYPE', label: '污染源类型' },
  { value: 'INSPECTION_CONFIG', label: '巡查配置' },
  { value: 'LOG', label: '日志' }
];

// 获取当前用户操作日志
export const getCurrentUserLogs = async (limit: number = 50): Promise<OperationLog[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const result = await getOperationLogs({
    user_id: user.id,
    limit
  });

  return result.logs;
};

// 获取最近的操作日志
export const getRecentLogs = async (limit: number = 20): Promise<OperationLog[]> => {
  const result = await getOperationLogs({ limit });
  return result.logs;
};
