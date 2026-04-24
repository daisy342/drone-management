import { supabase } from '../utils/supabase';
import { Log } from './logs';

// 任务转发状态
export type TaskForwardStatus = 'pending' | 'received' | 'processing' | 'resolved' | 'closed';

// 任务优先级
export type TaskPriority = 'high' | 'medium' | 'low';

// 任务转发接口
export interface TaskForward {
  id?: string;
  report_id: string;
  forward_to: string;
  contact_person?: string;
  contact_phone?: string;
  template: string;
  photos: string[];
  screenshots?: string[];  // 缺陷截图
  status: TaskForwardStatus;
  priority: TaskPriority;
  due_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  received_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  // 关联数据
  report?: Log;
}

// 状态显示文本
export const statusDisplayText: Record<TaskForwardStatus, { text: string; color: string }> = {
  pending: { text: '待发送', color: '#FF9800' },
  received: { text: '已接收', color: '#2196F3' },
  processing: { text: '处理中', color: '#9C27B0' },
  resolved: { text: '已解决', color: '#4CAF50' },
  closed: { text: '已关闭', color: '#757575' }
};

// 优先级显示文本
export const priorityDisplayText: Record<TaskPriority, { text: string; color: string }> = {
  high: { text: '高', color: '#F44336' },
  medium: { text: '中', color: '#FF9800' },
  low: { text: '低', color: '#4CAF50' }
};

// 生成默认转发模板
export const generateDefaultTemplate = (log: Log, issueDescription?: string): string => {
  const date = log.date || new Date().toISOString().split('T')[0];
  // 使用覆盖范围名称作为巡查区域，如果不存在则回退到旧字段
  const location = log.coverageAreaName || (log.provinceName && log.cityName && log.districtName
    ? [log.provinceName, log.cityName, log.districtName].filter(Boolean).join(' / ')
    : '巡查区域');
  const reportNumber = log.reportNumber || '';

  return `【问题转发】${reportNumber}

巡查日期：${date}
巡查区域：${location}
问题描述：${issueDescription || '巡查发现环境问题'}

请贵单位尽快处理并反馈处理结果。

联系电话：__________
`;
};

// 创建转发任务
export const createTaskForward = async (taskForward: Omit<TaskForward, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('task_forwards')
    .insert(taskForward)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TaskForward;
};

// 获取转发任务列表
export const getTaskForwards = async (filters?: {
  status?: TaskForwardStatus;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  reportId?: string;
}) => {
  let query = supabase
    .from('task_forwards')
    .select('*, report:logs(*)')
    .order('created_at', { ascending: false });

  if (filters) {
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate + 'T23:59:59');
    }
    if (filters.keyword) {
      query = query.or(`forward_to.ilike.%${filters.keyword}%,contact_person.ilike.%${filters.keyword}%`);
    }
    if (filters.reportId) {
      query = query.eq('report_id', filters.reportId);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  // 映射 report 字段，将下划线命名转换为驼峰命名
  return data.map((task: any) => ({
    ...task,
    report: task.report ? {
      ...task.report,
      reportNumber: task.report.report_number,
      provinceCode: task.report.province_code,
      provinceName: task.report.province_name,
      cityCode: task.report.city_code,
      cityName: task.report.city_name,
      districtCode: task.report.district_code,
      districtName: task.report.district_name,
      flightDuration: task.report.flight_duration,
      coverageArea: task.report.coverage_area,
      analysisConclusion: task.report.analysis_conclusion,
      analysisSummary: task.report.analysis_summary,
      autoGenerateAnalysis: task.report.auto_generate_analysis,
      isDraft: task.report.is_draft,
      relatedLogId: task.report.related_log_id,
    } : undefined
  })) as TaskForward[];
};

// 获取单个转发任务
export const getTaskForward = async (id: string) => {
  const { data, error } = await supabase
    .from('task_forwards')
    .select('*, report:logs(*)')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // 映射 report 字段
  return {
    ...data,
    report: data.report ? {
      ...data.report,
      reportNumber: data.report.report_number,
      provinceCode: data.report.province_code,
      provinceName: data.report.province_name,
      cityCode: data.report.city_code,
      cityName: data.report.city_name,
      districtCode: data.report.district_code,
      districtName: data.report.district_name,
      flightDuration: data.report.flight_duration,
      coverageArea: data.report.coverage_area,
      analysisConclusion: data.report.analysis_conclusion,
      analysisSummary: data.report.analysis_summary,
      autoGenerateAnalysis: data.report.auto_generate_analysis,
      isDraft: data.report.is_draft,
      relatedLogId: data.report.related_log_id,
    } : undefined
  } as TaskForward;
};

// 更新转发任务
export const updateTaskForward = async (id: string, updates: Partial<TaskForward>) => {
  // 移除不能更新的字段
  const { id: _, created_at, updated_at, created_by, ...updateData } = updates;

  const { data, error } = await supabase
    .from('task_forwards')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TaskForward;
};

// 删除转发任务
export const deleteTaskForward = async (id: string) => {
  const { error } = await supabase
    .from('task_forwards')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

// 更新任务状态
export const updateTaskStatus = async (
  id: string,
  newStatus: TaskForwardStatus,
  notes?: string
) => {
  const updateData: any = { status: newStatus };

  // 根据状态设置时间戳
  if (newStatus === 'received') {
    updateData.received_at = new Date().toISOString();
  } else if (newStatus === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
  }

  if (notes !== undefined) {
    updateData.resolution_notes = notes;
  }

  const { data, error } = await supabase
    .from('task_forwards')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TaskForward;
};

// 获取任务统计
export const getTaskStatistics = async (startDate?: string, endDate?: string) => {
  let query = supabase.from('task_forwards').select('*');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const tasks = data || [];

  // 按状态统计
  const statusStats: Record<TaskForwardStatus, number> = {
    pending: 0,
    received: 0,
    processing: 0,
    resolved: 0,
    closed: 0
  };

  // 按优先级统计
  const priorityStats: Record<TaskPriority, number> = {
    high: 0,
    medium: 0,
    low: 0
  };

  // 超时统计
  const overdueTasks: TaskForward[] = [];
  const today = new Date();

  tasks.forEach(task => {
    const status = task.status as TaskForwardStatus;
    const priority = task.priority as TaskPriority;
    statusStats[status] = (statusStats[status] || 0) + 1;
    priorityStats[priority] = (priorityStats[priority] || 0) + 1;

    // 检查是否超时（有期限且未解决/关闭，且已过期）
    if (task.due_date && task.status !== 'resolved' && task.status !== 'closed') {
      const dueDate = new Date(task.due_date);
      if (dueDate < today) {
        overdueTasks.push(task);
      }
    }
  });

  return {
    total: tasks.length,
    statusStats,
    priorityStats,
    overdueCount: overdueTasks.length,
    overdueTasks,
    completionRate: tasks.length > 0
      ? Math.round(((statusStats.resolved + statusStats.closed) / tasks.length) * 100)
      : 0
  };
};

// 批量更新任务状态
export const batchUpdateTaskStatus = async (ids: string[], newStatus: TaskForwardStatus) => {
  const { data, error } = await supabase
    .from('task_forwards')
    .update({ status: newStatus })
    .in('id', ids)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data as TaskForward[];
};

// 获取待处理的转发任务（即将到期）
export const getPendingTasks = async (daysAhead: number = 3) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('task_forwards')
    .select('*, report:logs(*)')
    .in('status', ['pending', 'received', 'processing'])
    .lte('due_date', futureDateStr)
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as TaskForward[];
};
