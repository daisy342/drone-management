import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 安全解析 issues 字段（支持字符串 JSON 或已解析的数组）
const safeParseIssues = (issues: any): any[] => {
  if (!issues) return [];
  if (Array.isArray(issues)) return issues;
  if (typeof issues === 'string') {
    try {
      const parsed = JSON.parse(issues);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// 问题类型定义
export interface Issue {
  id?: string;
  description: string;
  location: string;
  detailedAddress: string;
  longitude: number;
  latitude: number;
  pollutionTypeId: string;
  pollutionTypeName: string;
  severity: 'low' | 'medium' | 'high' | '';
  status: 'open' | 'closed';
  photos: string[];
  // 新增字段
  screenshots?: string[];      // 问题截图
  reportTo?: string;           // 上报对象
  reportResult?: string;       // 上报结果
  reportDate?: string;         // 上报日期
  remarks?: string;
}

// 报告状态类型
export type ReportStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// 日志类型定义
export interface Log {
  id?: string;
  // 报告基础信息
  reportNumber: string;
  report_number?: string;  // 数据库字段
  date: string;
  weekday: string;
  day_of_week?: number;    // 星期几（1-7）
  // 巡查区域（改为使用覆盖范围数据字典）
  coverageAreaId: string;
  coverage_area_id?: string;  // 数据库字段
  coverageAreaName: string;
  coverage_area_name?: string;  // 数据库字段
  // 巡查基站
  baseId: string;
  base_id?: string;
  baseName: string;
  base_name?: string;
  // 巡查航线
  routeId: string;
  route_id?: string;
  routeName: string;
  route_name?: string;
  // 保留旧字段用于兼容
  provinceCode?: string;
  provinceName?: string;
  cityCode?: string;
  cityName?: string;
  districtCode?: string;
  districtName?: string;
  // 天气信息
  weather: string;
  temperature?: number;
  // 巡查人员
  inspectors: string[];
  created_by?: string;     // 创建人ID
  // 关联日志
  relatedLogId?: string;
  related_log_id?: string;
  // 飞行信息
  flightDuration: number;
  flight_duration?: number;
  coverageArea: number;
  coverage_area?: number;
  // 问题和照片
  issues: Issue[];
  photos?: string[];
  // 分析结论
  analysisConclusion: string;
  analysis_conclusion?: string;
  analysisSummary?: string;  // 分析摘要
  analysis_summary?: string;
  autoGenerateAnalysis: boolean;
  auto_generate_analysis?: boolean;
  // 状态
  status: ReportStatus;
  // 审核相关
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  // 草稿标记
  isDraft: boolean;
  is_draft?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 创建日志
export const createLog = async (log: Omit<Log, 'id' | 'created_at' | 'updated_at'>) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  // 如果没有报告编号，自动生成
  let reportNumber = log.reportNumber;
  if (!reportNumber) {
    reportNumber = await generateReportNumber(log.date);
  }

  // 只包含数据库中实际存在的字段
  const dbLog = {
    report_number: reportNumber,
    date: log.date,
    weekday: log.weekday,
    day_of_week: log.day_of_week,
    // 新的覆盖范围字段
    coverage_area_id: log.coverageAreaId,
    coverage_area_name: log.coverageAreaName,
    // 基站字段
    base_id: log.baseId,
    base_name: log.baseName,
    // 航线字段
    route_id: log.routeId,
    route_name: log.routeName,
    // 保留旧字段兼容性
    province_code: log.provinceCode || '',
    province_name: log.provinceName || '',
    city_code: log.cityCode || '',
    city_name: log.cityName || '',
    district_code: log.districtCode || '',
    district_name: log.districtName || '',
    weather: log.weather,
    temperature: log.temperature,
    inspectors: log.inspectors,
    created_by: log.created_by,
    related_log_id: log.relatedLogId,
    flight_duration: log.flightDuration,
    coverage_area: log.coverageArea,
    issues: JSON.stringify(log.issues),
    photos: log.photos || [],
    analysis_conclusion: log.analysisConclusion,
    analysis_summary: log.analysisSummary,
    auto_generate_analysis: log.autoGenerateAnalysis,
    status: log.status || 'draft',
    is_draft: log.isDraft ?? true,
  };

  const { data, error } = await supabase
    .from('logs')
    .insert(dbLog)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};
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

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map((log) => ({
    ...log,
    // 区域字段映射
    provinceCode: log.province_code || '',
    provinceName: log.province_name || '',
    cityCode: log.city_code || '',
    cityName: log.city_name || '',
    districtCode: log.district_code || '',
    districtName: log.district_name || '',
    // 其他字段映射
    reportNumber: log.report_number || '',
    relatedLogId: log.related_log_id || '',
    flightDuration: log.flight_duration || 0,
    coverageArea: log.coverage_area || 0,
    analysisConclusion: log.analysis_conclusion || '',
    autoGenerateAnalysis: log.auto_generate_analysis ?? true,
    isDraft: log.is_draft ?? true,
    // issues 数组中的字段也需要映射
    issues: safeParseIssues(log.issues).map((issue: any) => ({
      id: issue.id || Date.now().toString(),
      description: issue.description || '',
      location: issue.location || '',
      detailedAddress: issue.detailed_address || '',
      longitude: issue.longitude || 0,
      latitude: issue.latitude || 0,
      pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
      pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
      severity: issue.severity || '',
      status: issue.status || 'open',
      photos: issue.photos || [],
      screenshots: issue.screenshots || [],
      reportTo: issue.report_to || issue.reportTo || '',
      reportResult: issue.report_result || issue.reportResult || '',
      reportDate: issue.report_date || issue.reportDate || '',
      remarks: issue.remarks || '',
    })),
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
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};
export const updateLog = async (id: string, log: Partial<Log>) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  // 只包含数据库中实际存在的字段
  const dbLog: any = {};
  if (log.reportNumber !== undefined) dbLog.report_number = log.reportNumber;
  if (log.date !== undefined) dbLog.date = log.date;
  if (log.weekday !== undefined) dbLog.weekday = log.weekday;
  // 新的覆盖范围字段
  if (log.coverageAreaId !== undefined) dbLog.coverage_area_id = log.coverageAreaId;
  if (log.coverageAreaName !== undefined) dbLog.coverage_area_name = log.coverageAreaName;
  // 保留旧字段兼容性
  if (log.provinceCode !== undefined) dbLog.province_code = log.provinceCode;
  if (log.provinceName !== undefined) dbLog.province_name = log.provinceName;
  if (log.cityCode !== undefined) dbLog.city_code = log.cityCode;
  if (log.cityName !== undefined) dbLog.city_name = log.cityName;
  if (log.districtCode !== undefined) dbLog.district_code = log.districtCode;
  if (log.districtName !== undefined) dbLog.district_name = log.districtName;
  if (log.weather !== undefined) dbLog.weather = log.weather;
  if (log.temperature !== undefined) dbLog.temperature = log.temperature;
  if (log.inspectors !== undefined) dbLog.inspectors = log.inspectors;
  if (log.relatedLogId !== undefined) dbLog.related_log_id = log.relatedLogId;
  if (log.flightDuration !== undefined) dbLog.flight_duration = log.flightDuration;
  if (log.coverageArea !== undefined) dbLog.coverage_area = log.coverageArea;
  if (log.issues !== undefined) dbLog.issues = JSON.stringify(log.issues);
  if (log.photos !== undefined) dbLog.photos = log.photos;
  if (log.analysisConclusion !== undefined) dbLog.analysis_conclusion = log.analysisConclusion;
  if (log.autoGenerateAnalysis !== undefined) dbLog.auto_generate_analysis = log.autoGenerateAnalysis;
  if (log.status !== undefined) dbLog.status = log.status;
  if (log.isDraft !== undefined) dbLog.is_draft = log.isDraft;

  const { data, error } = await supabase
    .from('logs')
    .update(dbLog)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};
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

// 上传问题照片到存储桶
export const uploadIssuePhoto = async (issueId: string, file: File, logReportNumber?: string) => {
  // 生成安全的文件名：提取扩展名，使用时间戳+随机数作为文件名
  const timestamp = Date.now();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeFileName = `${timestamp}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const fileName = `issues/${issueId}/${safeFileName}`;

  const { error } = await supabase.storage
    .from('log-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg'
    });

  if (error) {
    throw new Error(error.message);
  }

  // 获取照片URL
  const { data: urlData } = supabase.storage
    .from('log-photos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

// 生成报告编号
export const generateReportNumber = async (date: string) => {
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);
  const day = date.substring(8, 10);
  const dateStr = year + month + day;

  // 获取当日最后一条日志的序号
  const { data: existingLogs } = await supabase
    .from('logs')
    .select('report_number')
    .like('report_number', `巡查报告-${dateStr}-%`)
    .order('created_at', { ascending: false });

  let sequence = 1;
  if (existingLogs && existingLogs.length > 0) {
    // 提取最大序号
    const sequences = existingLogs
      .map(log => {
        const match = log.report_number?.match(/-(\d{3})$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    sequence = (sequences.length > 0 ? Math.max(...sequences) : 0) + 1;
  }

  return `巡查报告-${dateStr}-${String(sequence).padStart(3, '0')}`;
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
    const issues = safeParseIssues(log.issues);
    return sum + issues.length;
  }, 0);

  return {
    totalFlights,
    totalDuration,
    totalArea,
    totalIssues,
  };
};

// 提交报告审核
export const submitLogForReview = async (id: string, userId: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('logs')
    .update({
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // 记录审核历史
  await supabase.from('report_reviews').insert({
    report_id: id,
    reviewer_id: userId,
    action: 'submit',
    from_status: 'draft',
    to_status: 'pending',
  });

  return {
    ...data,
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};

// 审核报告
export const reviewLog = async (
  id: string,
  action: 'approve' | 'reject',
  reviewerId: string,
  comment?: string
) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  // 获取当前报告状态
  const { data: currentLog } = await supabase
    .from('logs')
    .select('status')
    .eq('id', id)
    .single();

  if (!currentLog) {
    throw new Error('报告不存在');
  }

  const fromStatus = currentLog.status;
  let toStatus: ReportStatus;

  switch (action) {
    case 'approve':
      toStatus = 'approved';
      break;
    case 'reject':
      toStatus = 'rejected';
      break;
    default:
      throw new Error('无效的审核操作');
  }

  const updateData: any = {
    status: toStatus,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  };

  if (comment) {
    updateData.review_comment = comment;
  }

  const { data, error } = await supabase
    .from('logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // 记录审核历史
  await supabase.from('report_reviews').insert({
    report_id: id,
    reviewer_id: reviewerId,
    action: action,
    comment: comment,
    from_status: fromStatus,
    to_status: toStatus,
  });

  return {
    ...data,
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};

// 归档报告
export const archiveLog = async (id: string, userId: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const { data: currentLog } = await supabase
    .from('logs')
    .select('status')
    .eq('id', id)
    .single();

  if (!currentLog) {
    throw new Error('报告不存在');
  }

  const { data, error } = await supabase
    .from('logs')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // 记录审核历史
  await supabase.from('report_reviews').insert({
    report_id: id,
    reviewer_id: userId,
    action: 'archive',
    from_status: currentLog.status,
    to_status: 'archived',
  });

  return {
    ...data,
    // 区域字段映射
    provinceCode: data.province_code || '',
    provinceName: data.province_name || '',
    cityCode: data.city_code || '',
    cityName: data.city_name || '',
    districtCode: data.district_code || '',
    districtName: data.district_name || '',
    // 新的覆盖范围字段映射
    coverageAreaId: data.coverage_area_id || '',
    coverageAreaName: data.coverage_area_name || '',
    // 基站字段映射
    baseId: data.base_id || '',
    baseName: data.base_name || '',
    // 航线字段映射
    routeId: data.route_id || '',
    routeName: data.route_name || '',
    // 其他字段映射
    reportNumber: data.report_number || '',
    relatedLogId: data.related_log_id || '',
    flightDuration: data.flight_duration || 0,
    coverageArea: data.coverage_area || 0,
    analysisConclusion: data.analysis_conclusion || '',
    autoGenerateAnalysis: data.auto_generate_analysis ?? true,
    isDraft: data.is_draft ?? true,
    // issues 数组中的字段也需要映射 - 支持驼峰和下划线两种命名
    issues: safeParseIssues(data.issues).map((issue: any) => {
      return {
        id: issue.id || Date.now().toString(),
        description: issue.description || '',
        location: issue.location || '',
        detailedAddress: issue.detailed_address || issue.detailedAddress || '',
        longitude: issue.longitude || 0,
        latitude: issue.latitude || 0,
        pollutionTypeId: issue.pollution_type_id || issue.pollutionTypeId || '',
        pollutionTypeName: issue.pollution_type_name || issue.pollutionTypeName || '',
        severity: issue.severity || '',
        status: issue.status || 'open',
        photos: issue.photos || [],
        screenshots: issue.screenshots || [],
        reportTo: issue.report_to || issue.reportTo || '',
        reportResult: issue.report_result || issue.reportResult || '',
        reportDate: issue.report_date || issue.reportDate || '',
        remarks: issue.remarks || '',
      };
    }),
  };
};

// 获取审核历史
export const getReviewHistory = async (reportId: string) => {
  const { data: reviews, error } = await supabase
    .from('report_reviews')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // 获取所有审核者的用户信息（从 profiles 表）
  const reviewerIds = reviews?.map(r => r.reviewer_id).filter(Boolean) || [];
  const uniqueReviewerIds = [...new Set(reviewerIds)];

  const reviewerMap: Record<string, { email: string; full_name: string; avatar_url: string }> = {};

  if (uniqueReviewerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', uniqueReviewerIds);

    profiles?.forEach(profile => {
      reviewerMap[profile.id] = {
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      };
    });
  }

  return reviews?.map(review => ({
    ...review,
    reviewer: reviewerMap[review.reviewer_id] || { email: '', full_name: '未知用户', avatar_url: '' }
  })) || [];
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

  // 创建下载链接（兼容 Safari）
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;

  // 兼容 Safari 的处理方式
  if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
    link.target = '_blank';
  }

  document.body.appendChild(link);
  link.click();

  // 延迟清理资源
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};