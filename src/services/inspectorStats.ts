import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 人员巡查统计类型
export interface InspectorStatistics {
  userId: string;
  userName: string;
  totalInspections: number;
  totalDuration: number;
  totalArea: number;
  totalIssues: number;
  monthlyStats: MonthlyInspectorStats[];
}

// 月度人员统计
export interface MonthlyInspectorStats {
  month: string;
  inspectionCount: number;
  duration: number;
  area: number;
  issues: number;
}

// 获取人员巡查统计
export const getInspectorStatistics = async (startDate?: string, endDate?: string) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  // 获取所有用户信息
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name');

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 获取日志数据
  let query = supabase.from('logs').select('*');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data: logs, error: logError } = await query;

  if (logError) {
    throw new Error(logError.message);
  }

  // 按人员统计
  const inspectorStats: Map<string, InspectorStatistics> = new Map();

  // 初始化统计对象
  profiles?.forEach((profile: any) => {
    inspectorStats.set(profile.id, {
      userId: profile.id,
      userName: profile.full_name || '未命名用户',
      totalInspections: 0,
      totalDuration: 0,
      totalArea: 0,
      totalIssues: 0,
      monthlyStats: [],
    });
  });

  // 按月分组统计
  const monthlyData: Map<string, Map<string, MonthlyInspectorStats>> = new Map();

  // 用于跟踪未匹配到profiles的巡查人员名称
  const unmatchedInspectors: Map<string, InspectorStatistics> = new Map();

  // 统计日志数据
  logs?.forEach((log) => {
    // 使用 Set 去重，避免同一日志被重复统计
    const processedUsers = new Set<string>();
    const processedUnmatchedNames = new Set<string>();

    // 统计巡查人员（inspectors数组中的人员）
    if (log.inspectors && Array.isArray(log.inspectors)) {
      log.inspectors.forEach((inspectorEntry: string) => {
        // 支持中文分号、英文分号、逗号分隔的多个人名
        const inspectorNames = inspectorEntry
          .split(/[；;,]+/)
          .map(s => s.trim())
          .filter(Boolean);

        inspectorNames.forEach((inspectorName: string) => {
          // 根据名称查找用户ID
          const profile = profiles?.find((p: any) => p.full_name === inspectorName);
          if (profile) {
            if (!processedUsers.has(profile.id)) {
              processedUsers.add(profile.id);
              const stats = inspectorStats.get(profile.id);
              if (stats) {
                stats.totalInspections++;
                stats.totalDuration += log.flight_duration || 0;
                stats.totalArea += log.coverage_area || 0;
                try {
                  const issues = JSON.parse(log.issues as string || '[]');
                  stats.totalIssues += Array.isArray(issues) ? issues.length : 0;
                } catch {
                  // 解析失败不增加问题数
                }
              }
            }
          } else {
            // 未在 profiles 中找到匹配的人员，创建临时统计
            if (!processedUnmatchedNames.has(inspectorName)) {
              processedUnmatchedNames.add(inspectorName);
              if (!unmatchedInspectors.has(inspectorName)) {
                unmatchedInspectors.set(inspectorName, {
                  userId: `unmatched_${inspectorName}`,
                  userName: inspectorName,
                  totalInspections: 0,
                  totalDuration: 0,
                  totalArea: 0,
                  totalIssues: 0,
                  monthlyStats: [],
                });
              }
              const stats = unmatchedInspectors.get(inspectorName)!;
              stats.totalInspections++;
              stats.totalDuration += log.flight_duration || 0;
              stats.totalArea += log.coverage_area || 0;
              try {
                const issues = JSON.parse(log.issues as string || '[]');
                stats.totalIssues += Array.isArray(issues) ? issues.length : 0;
              } catch {
                // 解析失败不增加问题数
              }
            }
          }
        });
      });
    }

    // 如果巡查人员列表为空且创建人存在，则统计创建人
    if (processedUsers.size === 0 && processedUnmatchedNames.size === 0 && log.created_by) {
      const stats = inspectorStats.get(log.created_by);
      if (stats) {
        stats.totalInspections++;
        stats.totalDuration += log.flight_duration || 0;
        stats.totalArea += log.coverage_area || 0;
        try {
          const issues = JSON.parse(log.issues as string || '[]');
          stats.totalIssues += Array.isArray(issues) ? issues.length : 0;
        } catch {
          // 解析失败不增加问题数
        }
      } else {
        // 创建人不在 profiles 中，统计为未知人员
        const unknownUserId = 'unknown';
        if (!inspectorStats.has(unknownUserId)) {
          inspectorStats.set(unknownUserId, {
            userId: unknownUserId,
            userName: '未知人员',
            totalInspections: 0,
            totalDuration: 0,
            totalArea: 0,
            totalIssues: 0,
            monthlyStats: [],
          });
        }
        const unknownStats = inspectorStats.get(unknownUserId)!;
        unknownStats.totalInspections++;
        unknownStats.totalDuration += log.flight_duration || 0;
        unknownStats.totalArea += log.coverage_area || 0;
        try {
          const issues = JSON.parse(log.issues as string || '[]');
          unknownStats.totalIssues += Array.isArray(issues) ? issues.length : 0;
        } catch {
          // 解析失败不增加问题数
        }
      }
    }

    // 如果既没有巡查人员也没有创建人，统计为未知人员
    if (processedUsers.size === 0 && processedUnmatchedNames.size === 0 && !log.created_by) {
      const unknownUserId = 'unknown';
      if (!inspectorStats.has(unknownUserId)) {
        inspectorStats.set(unknownUserId, {
          userId: unknownUserId,
          userName: '未知人员',
          totalInspections: 0,
          totalDuration: 0,
          totalArea: 0,
          totalIssues: 0,
          monthlyStats: [],
        });
      }
      const stats = inspectorStats.get(unknownUserId)!;
      stats.totalInspections++;
      stats.totalDuration += log.flight_duration || 0;
      stats.totalArea += log.coverage_area || 0;
      try {
        const issues = JSON.parse(log.issues as string || '[]');
        stats.totalIssues += Array.isArray(issues) ? issues.length : 0;
      } catch {
        // 解析失败不增加问题数
      }
    }

    // 按月统计（基于已统计的人员）
    const month = log.date.substring(0, 7);
    if (!monthlyData.has(month)) {
      monthlyData.set(month, new Map());
    }

    const monthMap = monthlyData.get(month)!;

    // 统计已匹配的profiles用户
    processedUsers.forEach((userId) => {
      if (!monthMap.has(userId)) {
        monthMap.set(userId, {
          month,
          inspectionCount: 0,
          duration: 0,
          area: 0,
          issues: 0,
        });
      }

      const monthStats = monthMap.get(userId)!;
      monthStats.inspectionCount++;
      monthStats.duration += log.flight_duration || 0;
      monthStats.area += log.coverage_area || 0;
      try {
        const issues = JSON.parse(log.issues as string || '[]');
        monthStats.issues += Array.isArray(issues) ? issues.length : 0;
      } catch {
        // 解析失败不增加问题数
      }
    });

    // 统计未匹配的人员名称
    processedUnmatchedNames.forEach((inspectorName) => {
      const unmatchedId = `unmatched_${inspectorName}`;
      if (!monthMap.has(unmatchedId)) {
        monthMap.set(unmatchedId, {
          month,
          inspectionCount: 0,
          duration: 0,
          area: 0,
          issues: 0,
        });
      }

      const monthStats = monthMap.get(unmatchedId)!;
      monthStats.inspectionCount++;
      monthStats.duration += log.flight_duration || 0;
      monthStats.area += log.coverage_area || 0;
      try {
        const issues = JSON.parse(log.issues as string || '[]');
        monthStats.issues += Array.isArray(issues) ? issues.length : 0;
      } catch {
        // 解析失败不增加问题数
      }
    });

    // 如果巡查人员列表为空且创建人存在，统计创建人
    if (processedUsers.size === 0 && processedUnmatchedNames.size === 0 && log.created_by) {
      const stats = inspectorStats.get(log.created_by);
      if (stats) {
        if (!monthMap.has(log.created_by)) {
          monthMap.set(log.created_by, {
            month,
            inspectionCount: 0,
            duration: 0,
            area: 0,
            issues: 0,
          });
        }

        const monthStats = monthMap.get(log.created_by)!;
        monthStats.inspectionCount++;
        monthStats.duration += log.flight_duration || 0;
        monthStats.area += log.coverage_area || 0;
        try {
          const issues = JSON.parse(log.issues as string || '[]');
          monthStats.issues += Array.isArray(issues) ? issues.length : 0;
        } catch {
          // 解析失败不增加问题数
        }
      }
    }
  });

  // 将未匹配的人员统计合并到主统计对象
  unmatchedInspectors.forEach((stats, name) => {
    inspectorStats.set(stats.userId, stats);
  });

  // 将月度统计数据合并到人员统计中
  inspectorStats.forEach((stats, userId) => {
    const userMonthlyStats: MonthlyInspectorStats[] = [];
    monthlyData.forEach((monthMap, month) => {
      const monthStats = monthMap.get(userId);
      if (monthStats) {
        userMonthlyStats.push(monthStats);
      }
    });
    stats.monthlyStats = userMonthlyStats.sort((a, b) => a.month.localeCompare(b.month));
  });

  return Array.from(inspectorStats.values()).sort((a, b) => b.totalInspections - a.totalInspections);
};

// 获取巡查次数趋势（按人员）
export const getInspectionTrendByInspector = async (inspectorId: string, months: number = 6) => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  // 获取用户信息
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', inspectorId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 生成最近N个月的月份数组
  const monthLabels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // 查询该人员的巡查记录
  const startDate = `${monthLabels[0]}-01`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const { data: logs, error: logError } = await supabase
    .from('logs')
    .select('date, created_by, inspectors')
    .gte('date', startDate)
    .lte('date', endDate);

  if (logError) {
    throw new Error(logError.message);
  }

  // 按月统计巡查次数
  const monthlyCount: Record<string, number> = {};
  monthLabels.forEach((month) => {
    monthlyCount[month] = 0;
  });

  logs?.forEach((log) => {
    const month = log.date.substring(0, 7);
    if (monthLabels.includes(month)) {
      // 检查是否是该用户的记录
      if (log.created_by === inspectorId) {
        monthlyCount[month]++;
      }
      // 或者检查巡查人员列表
      if (log.inspectors && Array.isArray(log.inspectors)) {
        const profileName = profile?.full_name;
        if (log.inspectors.includes(profileName)) {
          monthlyCount[month]++;
        }
      }
    }
  });

  return monthLabels.map((month) => ({
    month,
    count: monthlyCount[month] || 0,
  }));
};
