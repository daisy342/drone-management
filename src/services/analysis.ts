import { supabase } from '../utils/supabase';

// 统计数据类型定义
export interface Statistics {
  totalFlights: number;
  totalDuration: number;
  totalArea: number;
  totalIssues: number;
  averageDuration: number;
  averageArea: number;
  issueRate: number;
}

// 趋势数据类型定义
export interface TrendData {
  date: string;
  value: number;
}

// 问题分布类型定义
export interface IssueDistribution {
  severity: string;
  count: number;
  percentage: number;
}

// 基地统计类型定义
export interface BaseStatistics {
  baseId: string;
  baseName: string;
  totalFlights: number;
  totalDuration: number;
  totalArea: number;
  totalIssues: number;
}

// 获取总体统计数据
export const getOverallStatistics = async (startDate?: string, endDate?: string) => {
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

  const totalFlights = data.length;
  const totalDuration = data.reduce((sum, log) => sum + (log.flight_duration || 0), 0);
  const totalArea = data.reduce((sum, log) => sum + (log.coverage_area || 0), 0);
  
  // 计算问题数量
  const totalIssues = data.reduce((sum, log) => {
    try {
      const issues = JSON.parse(log.issues as string || '[]');
      return sum + (Array.isArray(issues) ? issues.length : 0);
    } catch (error) {
      console.error('Error parsing issues:', error);
      return sum;
    }
  }, 0);

  const averageDuration = totalFlights > 0 ? totalDuration / totalFlights : 0;
  const averageArea = totalFlights > 0 ? totalArea / totalFlights : 0;
  const issueRate = totalFlights > 0 ? (totalIssues / totalFlights) * 100 : 0;

  return {
    totalFlights,
    totalDuration,
    totalArea,
    totalIssues,
    averageDuration,
    averageArea,
    issueRate,
  };
};

// 获取飞行趋势数据
export const getFlightTrend = async (period: 'day' | 'week' | 'month' | 'year' = 'month', startDate?: string, endDate?: string) => {
  let query = supabase.from('logs').select('date, flight_duration, coverage_area');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // 按时间周期分组
  const groupedData: Record<string, { duration: number; area: number; count: number }> = {};

  data.forEach(log => {
    let key: string;
    const date = new Date(log.date);

    switch (period) {
      case 'day':
        key = log.date;
        break;
      case 'week':
        // 获取周开始日期
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = log.date.substring(0, 7); // YYYY-MM
        break;
      case 'year':
        key = log.date.substring(0, 4); // YYYY
        break;
      default:
        key = log.date;
    }

    if (!groupedData[key]) {
      groupedData[key] = { duration: 0, area: 0, count: 0 };
    }

    groupedData[key].duration += log.flight_duration || 0;
    groupedData[key].area += log.coverage_area || 0;
    groupedData[key].count += 1;
  });

  // 转换为趋势数据格式
  const trendData: TrendData[] = Object.entries(groupedData).map(([date, values]) => ({
    date,
    value: values.count,
  }));

  return trendData;
};

// 获取问题趋势数据
export const getIssueTrend = async (period: 'day' | 'week' | 'month' | 'year' = 'month', startDate?: string, endDate?: string) => {
  let query = supabase.from('logs').select('date, issues');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // 按时间周期分组
  const groupedData: Record<string, number> = {};

  data.forEach(log => {
    let key: string;
    const date = new Date(log.date);

    switch (period) {
      case 'day':
        key = log.date;
        break;
      case 'week':
        // 获取周开始日期
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = log.date.substring(0, 7); // YYYY-MM
        break;
      case 'year':
        key = log.date.substring(0, 4); // YYYY
        break;
      default:
        key = log.date;
    }

    const issues = JSON.parse(log.issues as string);
    groupedData[key] = (groupedData[key] || 0) + issues.length;
  });

  // 转换为趋势数据格式
  const trendData: TrendData[] = Object.entries(groupedData).map(([date, count]) => ({
    date,
    value: count,
  }));

  return trendData;
};

// 获取问题分布数据
export const getIssueDistribution = async (startDate?: string, endDate?: string) => {
  let query = supabase.from('logs').select('issues');

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

  // 统计不同严重程度的问题数量
  const severityCount: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  let totalIssues = 0;

  data.forEach(log => {
    const issues = JSON.parse(log.issues as string);
    issues.forEach((issue: any) => {
      if (severityCount.hasOwnProperty(issue.severity)) {
        severityCount[issue.severity]++;
      }
      totalIssues++;
    });
  });

  // 转换为分布数据格式
  const distribution: IssueDistribution[] = Object.entries(severityCount).map(([severity, count]) => ({
    severity,
    count,
    percentage: totalIssues > 0 ? (count / totalIssues) * 100 : 0,
  }));

  return distribution;
};

// 获取基地统计数据
export const getBaseStatistics = async (startDate?: string, endDate?: string) => {
  let query = supabase.from('logs').select('base_id, flight_duration, coverage_area, issues');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data: logData, error: logError } = await query;

  if (logError) {
    throw new Error(logError.message);
  }

  // 获取基地信息
  const { data: baseData, error: baseError } = await supabase.from('bases').select('id, name');

  if (baseError) {
    throw new Error(baseError.message);
  }

  // 创建基地ID到名称的映射
  const baseMap = new Map<string, string>();
  baseData.forEach(base => {
    baseMap.set(base.id, base.name);
  });

  // 按基地分组统计
  const baseStats: Record<string, { totalFlights: number; totalDuration: number; totalArea: number; totalIssues: number }> = {};

  logData.forEach(log => {
    const baseId = log.base_id;
    if (!baseStats[baseId]) {
      baseStats[baseId] = { totalFlights: 0, totalDuration: 0, totalArea: 0, totalIssues: 0 };
    }

    baseStats[baseId].totalFlights++;
    baseStats[baseId].totalDuration += log.flight_duration || 0;
    baseStats[baseId].totalArea += log.coverage_area || 0;

    const issues = JSON.parse(log.issues as string);
    baseStats[baseId].totalIssues += issues.length;
  });

  // 转换为基地统计数据格式
  const statistics: BaseStatistics[] = Object.entries(baseStats).map(([baseId, stats]) => ({
    baseId,
    baseName: baseMap.get(baseId) || baseId,
    ...stats,
  }));

  // 按飞行次数排序
  statistics.sort((a, b) => b.totalFlights - a.totalFlights);

  return statistics;
};

// 获取月度报告数据
export const getMonthlyReport = async (year: number, month: number) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  // 获取月度统计数据
  const stats = await getOverallStatistics(startDate, endDate);

  // 获取月度飞行趋势
  const flightTrend = await getFlightTrend('day', startDate, endDate);

  // 获取月度问题趋势
  const issueTrend = await getIssueTrend('day', startDate, endDate);

  // 获取月度问题分布
  const issueDistribution = await getIssueDistribution(startDate, endDate);

  // 获取月度基地统计
  const baseStatistics = await getBaseStatistics(startDate, endDate);

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    statistics: stats,
    flightTrend,
    issueTrend,
    issueDistribution,
    baseStatistics,
  };
};

// 导出分析报告
export const exportAnalysisReport = async (startDate?: string, endDate?: string) => {
  // 获取各种统计数据
  const stats = await getOverallStatistics(startDate, endDate);
  const flightTrend = await getFlightTrend('month', startDate, endDate);
  const issueTrend = await getIssueTrend('month', startDate, endDate);
  const issueDistribution = await getIssueDistribution(startDate, endDate);
  const baseStatistics = await getBaseStatistics(startDate, endDate);

  // 生成报告内容
  const reportContent = `
# 无人机业务分析报告

## 总体统计
- 总飞行次数: ${stats.totalFlights}
- 总飞行时长: ${stats.totalDuration.toFixed(2)} 分钟
- 总覆盖面积: ${stats.totalArea.toFixed(2)} 平方公里
- 总发现问题数: ${stats.totalIssues}
- 平均飞行时长: ${stats.averageDuration.toFixed(2)} 分钟/次
- 平均覆盖面积: ${stats.averageArea.toFixed(2)} 平方公里/次
- 问题发生率: ${stats.issueRate.toFixed(2)}%

## 飞行趋势
${flightTrend.map(item => `- ${item.date}: ${item.value} 次`).join('\n')}

## 问题趋势
${issueTrend.map(item => `- ${item.date}: ${item.value} 个`).join('\n')}

## 问题分布
${issueDistribution.map(item => `- ${item.severity}: ${item.count} 个 (${item.percentage.toFixed(2)}%)`).join('\n')}

## 基地统计
${baseStatistics.map(item => `- ${item.baseName}: ${item.totalFlights} 次飞行, ${item.totalDuration.toFixed(2)} 分钟, ${item.totalArea.toFixed(2)} 平方公里, ${item.totalIssues} 个问题`).join('\n')}

## 报告生成时间
${new Date().toISOString()}
  `;

  // 创建下载链接
  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `analysis_report_${startDate || 'all'}_${endDate || 'all'}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};