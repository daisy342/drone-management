import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 年度计划类型定义
export interface AnnualPlan {
  id?: string;
  year: number;
  baseId?: string;
  baseName?: string;
  targetInspections: number;
  targetArea: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 年度计划进度类型
export interface AnnualPlanProgress {
  year: number;
  baseId?: string;
  baseName?: string;
  targetInspections: number;
  targetArea: number;
  actualInspections: number;
  actualArea: number;
  inspectionProgress: number;
  areaProgress: number;
}

// 获取年度计划
export const getAnnualPlans = async (year?: number) => {
  const tableExists = await checkTableExists('annual_plans');
  if (!tableExists) {
    throw new Error("数据库表 'annual_plans' 不存在。请联系管理员初始化数据库。");
  }

  let query = supabase.from('annual_plans').select('*');

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query.order('year', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map((plan) => ({
    id: plan.id,
    year: plan.year,
    baseId: plan.base_id,
    targetInspections: plan.target_inspections || 0,
    targetArea: plan.target_area || 0,
    createdBy: plan.created_by,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  }));
};

// 获取年度计划进度（包含实际完成情况）
export const getAnnualPlanProgress = async (year: number) => {
  const tableExists = await checkTableExists('annual_plans');
  if (!tableExists) {
    throw new Error("数据库表 'annual_plans' 不存在。请联系管理员初始化数据库。");
  }

  // 获取年度计划
  const { data: plans, error: planError } = await supabase
    .from('annual_plans')
    .select('*')
    .eq('year', year);

  if (planError) {
    throw new Error(planError.message);
  }

  // 获取基站名称（从字典表）
  const { data: bases, error: baseError } = await supabase
    .from('dictionary')
    .select('id, name')
    .eq('type', 'base_station')
    .eq('is_active', true);

  if (baseError) {
    throw new Error(baseError.message);
  }

  const baseMap = new Map<string, string>();
  bases?.forEach((base: any) => {
    baseMap.set(base.id, base.name);
  });

  // 获取本年度实际完成数据（包含 base_id 用于分组统计）
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const { data: logs, error: logError } = await supabase
    .from('logs')
    .select('base_id, flight_duration, coverage_area, status')
    .gte('date', startDate)
    .lte('date', endDate);

  if (logError) {
    throw new Error(logError.message);
  }

  const totalInspections = logs?.length || 0;
  const totalArea = logs?.reduce((sum, log) => sum + (log.coverage_area || 0), 0) || 0;

  // 按基站分组统计实际完成数据
  const baseStats: Record<string, { actualInspections: number; actualArea: number }> = {};
  logs?.forEach((log: any) => {
    const baseId = log.base_id;
    if (!baseStats[baseId]) {
      baseStats[baseId] = { actualInspections: 0, actualArea: 0 };
    }
    baseStats[baseId].actualInspections++;
    baseStats[baseId].actualArea += log.coverage_area || 0;
  });

  // 构建进度数据
  const progress: AnnualPlanProgress[] = [];

  if (plans && plans.length > 0) {
    plans.forEach((plan) => {
      const targetInspections = plan.target_inspections || 0;
      const targetArea = plan.target_area || 0;
      const baseId = plan.base_id;

      // 如果有基站ID，取该基站的实际完成数据；否则取总体
      const actualData = baseId
        ? baseStats[baseId] || { actualInspections: 0, actualArea: 0 }
        : { actualInspections: totalInspections, actualArea: totalArea };

      progress.push({
        year,
        baseId,
        baseName: baseMap.get(baseId) || '全部基站',
        targetInspections,
        targetArea,
        actualInspections: actualData.actualInspections,
        actualArea: actualData.actualArea,
        inspectionProgress: targetInspections > 0 ? Math.round((actualData.actualInspections / targetInspections) * 100) : 0,
        areaProgress: targetArea > 0 ? Math.round((actualData.actualArea / targetArea) * 100) : 0,
      });
    });
  } else {
    // 如果没有设置计划，按实际数据分组返回
    Object.entries(baseStats).forEach(([baseId, stats]) => {
      progress.push({
        year,
        baseId,
        baseName: baseMap.get(baseId) || baseId,
        targetInspections: 0,
        targetArea: 0,
        actualInspections: stats.actualInspections,
        actualArea: stats.actualArea,
        inspectionProgress: 0,
        areaProgress: 0,
      });
    });

    // 如果没有基站分组数据，返回总体
    if (progress.length === 0) {
      progress.push({
        year,
        targetInspections: 0,
        targetArea: 0,
        actualInspections: totalInspections,
        actualArea: totalArea,
        inspectionProgress: 0,
        areaProgress: 0,
      });
    }
  }

  return progress;
};

// 创建年度计划
export const createAnnualPlan = async (plan: Omit<AnnualPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
  const tableExists = await checkTableExists('annual_plans');
  if (!tableExists) {
    throw new Error("数据库表 'annual_plans' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('annual_plans')
    .insert({
      year: plan.year,
      base_id: plan.baseId,
      target_inspections: plan.targetInspections,
      target_area: plan.targetArea,
      created_by: plan.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    year: data.year,
    baseId: data.base_id,
    targetInspections: data.target_inspections,
    targetArea: data.target_area,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

// 更新年度计划
export const updateAnnualPlan = async (id: string, plan: Partial<AnnualPlan>) => {
  const tableExists = await checkTableExists('annual_plans');
  if (!tableExists) {
    throw new Error("数据库表 'annual_plans' 不存在。请联系管理员初始化数据库。");
  }

  const updateData: any = {};
  if (plan.year !== undefined) updateData.year = plan.year;
  if (plan.baseId !== undefined) updateData.base_id = plan.baseId;
  if (plan.targetInspections !== undefined) updateData.target_inspections = plan.targetInspections;
  if (plan.targetArea !== undefined) updateData.target_area = plan.targetArea;

  const { data, error } = await supabase
    .from('annual_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    year: data.year,
    baseId: data.base_id,
    targetInspections: data.target_inspections,
    targetArea: data.target_area,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

// 删除年度计划
export const deleteAnnualPlan = async (id: string) => {
  const tableExists = await checkTableExists('annual_plans');
  if (!tableExists) {
    throw new Error("数据库表 'annual_plans' 不存在。请联系管理员初始化数据库。");
  }

  const { error } = await supabase.from('annual_plans').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};
