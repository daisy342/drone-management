import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 绩效记录类型
export interface PerformanceRecord {
  id?: string;
  userId: string;
  userName?: string;
  month: string; // YYYY-MM
  inspectionCount: number;
  issueCount: number;
  reportQualityScore: number;
  totalScore: number;
  calculatedAt?: string;
}

// 绩效配置类型
export interface PerformanceConfig {
  baseScore: number;
  inspectionWeight: number;
  issueWeight: number;
  qualityWeight: number;
  minInspectionsForBonus: number;
  issueBonusThreshold: number;
}

// 默认绩效配置
const defaultConfig: PerformanceConfig = {
  baseScore: 60, // 基础分60分
  inspectionWeight: 0.3, // 巡查次数权重30%
  issueWeight: 0.3, // 问题发现权重30%
  qualityWeight: 0.4, // 报告质量权重40%
  minInspectionsForBonus: 10, // 每月最少10次巡查才能获得加分
  issueBonusThreshold: 5, // 每月发现5个问题以上有额外奖励
};

// 计算个人绩效
export const calculatePerformance = async (
  userId: string,
  year: number,
  month: number,
  config: PerformanceConfig = defaultConfig
): Promise<PerformanceRecord> => {
  const tableExists = await checkTableExists('logs');
  if (!tableExists) {
    throw new Error("数据库表 'logs' 不存在。请联系管理员初始化数据库。");
  }

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-31`;

  // 获取用户当月巡查记录
  const { data: logs, error: logError } = await supabase
    .from('logs')
    .select('*')
    .eq('created_by', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (logError) {
    throw new Error(logError.message);
  }

  // 获取用户信息
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 统计数据
  const inspectionCount = logs?.length || 0;
  let issueCount = 0;
  let totalQuality = 0;

  logs?.forEach((log) => {
    // 统计问题数
    try {
      const issues = JSON.parse(log.issues as string || '[]');
      issueCount += Array.isArray(issues) ? issues.length : 0;
    } catch {
      // 解析失败不增加问题数
    }

    // 计算报告质量分（基于问题详细程度、照片数量等）
    let quality = 60; // 基础质量分
    if (log.analysis_conclusion && log.analysis_conclusion.length > 50) quality += 10;
    if (log.photos && log.photos.length > 0) quality += 10;
    if (log.status === 'approved') quality += 20; // 审核通过加分
    totalQuality += Math.min(quality, 100);
  });

  const averageQuality = inspectionCount > 0 ? totalQuality / inspectionCount : 0;

  // 计算绩效分
  // 基础分 + 巡查次数得分 + 问题发现得分 + 质量得分
  let score = config.baseScore;

  // 巡查次数得分（每完成一次巡查加一定分数，但有上限）
  const inspectionScore = Math.min(inspectionCount * 2, 30); // 最多30分
  score += inspectionScore * config.inspectionWeight;

  // 问题发现得分（每发现一个问题加一定分数）
  const issueScore = Math.min(issueCount * 3, 30); // 最多30分
  score += issueScore * config.issueWeight;

  // 质量得分
  const qualityScore = (averageQuality / 100) * 40; // 最高40分
  score += qualityScore * config.qualityWeight;

  // 额外奖励
  if (inspectionCount >= config.minInspectionsForBonus) {
    score += 5; // 完成基本任务奖励
  }
  if (issueCount >= config.issueBonusThreshold) {
    score += 5; // 问题发现奖励
  }

  // 封顶100分
  const totalScore = Math.min(Math.round(score), 100);

  return {
    userId,
    userName: profile?.full_name || '未知用户',
    month: monthStr,
    inspectionCount,
    issueCount,
    reportQualityScore: Math.round(averageQuality),
    totalScore,
    calculatedAt: new Date().toISOString(),
  };
};

// 获取团队绩效统计
export const getTeamPerformance = async (year: number, month: number) => {
  const tableExists = await checkTableExists('profiles');
  if (!tableExists) {
    throw new Error("数据库表 'profiles' 不存在。请联系管理员初始化数据库。");
  }

  // 获取所有用户
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name');

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 计算每个用户的绩效
  const performances: PerformanceRecord[] = [];
  for (const profile of profiles || []) {
    try {
      const performance = await calculatePerformance(profile.id, year, month);
      performances.push(performance);
    } catch (err) {
      // 忽略单个用户的计算错误
    }
  }

  // 按绩效分排序
  performances.sort((a, b) => b.totalScore - a.totalScore);

  return performances;
};

// 获取个人历史绩效
export const getPersonalPerformanceHistory = async (
  userId: string,
  months: number = 6
): Promise<PerformanceRecord[]> => {
  const history: PerformanceRecord[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    try {
      const performance = await calculatePerformance(userId, d.getFullYear(), d.getMonth() + 1);
      history.push(performance);
    } catch (err) {
      // 忽略历史绩效计算错误
    }
  }

  return history;
};

// 获取绩效趋势分析
export const getPerformanceTrend = async (userId: string, months: number = 6) => {
  const history = await getPersonalPerformanceHistory(userId, months);

  return {
    labels: history.map((h) => h.month),
    scores: history.map((h) => h.totalScore),
    inspections: history.map((h) => h.inspectionCount),
    issues: history.map((h) => h.issueCount),
  };
};

// 获取绩效排名
export const getPerformanceRanking = async (year: number, month: number, limit: number = 10) => {
  const performances = await getTeamPerformance(year, month);

  return performances.slice(0, limit).map((p, index) => ({
    rank: index + 1,
    ...p,
  }));
};

// 绩效评级
export const getPerformanceGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// 绩效评级描述
export const getPerformanceGradeDescription = (score: number): string => {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '合格';
  if (score >= 60) return '待改进';
  return '不合格';
};
