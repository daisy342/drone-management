import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 日志类型定义
export interface Log {
  id?: string;
  date: string;
  time: string;
  base_id: string;
  route_id: string;
  area_id: string;
  flight_duration: number; // 飞行时长（分钟）
  coverage_area: number; // 覆盖面积（平方公里）
  issues: Issue[];
  photos?: string[]; // 照片URL数组
  status: 'pending' | 'reviewed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

// 问题类型定义
export interface Issue {
  id?: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'closed';
  remarks?: string;
}

// 创建日志
export const createLog = async (log: Omit<Log, 'id' | 'created_at' | 'updated_at'>) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('logs')
    .insert({
      ...log,
      issues: JSON.stringify(log.issues),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    issues: JSON.parse(data.issues as string),
  };
};

// 获取日志列表
export const getLogs = async (filters?: {
  startDate?: string;
  endDate?: string;
  baseId?: string;
  routeId?: string;
  areaId?: string;
  status?: string;
}) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  let query = supabase.from('logs').select('*');

  if (filters) {
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.baseId) {
      query = query.eq('base_id', filters.baseId);
    }
    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }
    if (filters.areaId) {
      query = query.eq('area_id', filters.areaId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map((log) => ({
    ...log,
    issues: JSON.parse(log.issues as string),
  }));
};

// 获取单个日志
export const getLog = async (id: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    issues: JSON.parse(data.issues as string),
  };
};

// 更新日志
export const updateLog = async (id: string, log: Partial<Log>) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('logs')
    .update({
      ...log,
      ...(log.issues && { issues: JSON.stringify(log.issues) }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    issues: JSON.parse(data.issues as string),
  };
};

// 删除日志
export const deleteLog = async (id: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { error } = await supabase.from('logs').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

// 上传日志照片
export const uploadLogPhoto = async (logId: string, file: File) => {
  const fileName = `${logId}/${Date.now()}_${file.name}`;
  
  const { error } = await supabase.storage
    .from('log-photos')
    .upload(fileName, file, { cacheControl: '3600' });

  if (error) {
    throw new Error(error.message);
  }

  // 获取照片URL
  const { data: urlData } = supabase.storage
    .from('log-photos')
    .getPublicUrl(fileName);

  // 更新日志的照片数组
  const log = await getLog(logId);
  const updatedPhotos = [...(log.photos || []), urlData.publicUrl];

  await updateLog(logId, { photos: updatedPhotos });

  return urlData.publicUrl;
};

// 生成报告编号
export const generateReportNumber = async (date: string) => {
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);
  
  // 获取当月最后一条日志
  const { data: lastLog } = await supabase
    .from('logs')
    .select('id')
    .like('date', `${year}-${month}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let sequence = 1;
  if (lastLog) {
    // 提取当前序号并加1
    const { data: logs } = await supabase
      .from('logs')
      .select('id')
      .like('date', `${year}-${month}-%`);
    sequence = (logs?.length || 0) + 1;
  }

  return `DR-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// 统计数据
export const getLogStatistics = async (startDate?: string, endDate?: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  let query = supabase.from('logs').select('*');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  // 计算统计数据
  const totalFlights = data.length;
  const totalDuration = data.reduce((sum, log) => sum + (log.flight_duration || 0), 0);
  const totalArea = data.reduce((sum, log) => sum + (log.coverage_area || 0), 0);

  // 计算问题数量
  const totalIssues = data.reduce((sum, log) => {
    const issues = JSON.parse(log.issues as string);
    return sum + issues.length;
  }, 0);

  return {
    totalFlights,
    totalDuration,
    totalArea,
    totalIssues,
  };
};

// 导出日志数据
export const exportLogs = async (filters?: {
  startDate?: string;
  endDate?: string;
  baseId?: string;
  routeId?: string;
  areaId?: string;
  status?: string;
}) => {
  const logs = await getLogs(filters);
  
  // 转换为CSV格式
  const headers = [
    '日期', '时间', '基地', '航线', '责任区', '飞行时长(分钟)', 
    '覆盖面积(平方公里)', '状态', '问题数量', '创建时间'
  ];
  
  const rows = logs.map(log => [
    log.date,
    log.time,
    log.base_id,
    log.route_id,
    log.area_id,
    log.flight_duration,
    log.coverage_area,
    log.status,
    log.issues.length,
    log.created_at
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};