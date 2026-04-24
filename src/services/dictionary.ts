import { supabase } from '../utils/supabase';
import { checkTableExists } from '../utils/database';

// 数据字典类型定义
export type DictionaryType =
  | 'base_station'      // 基站
  | 'route'             // 航线
  | 'coverage_area'     // 覆盖范围
  | 'responsible_unit'  // 责任单位
  | 'pollution_type'    // 污染源类型
  | 'inspection_config'; // 巡查次数配置

// 数据字典项接口
export interface DictionaryItem {
  id?: string;
  type: DictionaryType;
  code: string;
  name: string;
  description?: string;
  // 扩展字段，用于存储额外的配置信息
  extra_data?: Record<string, any>;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 获取数据字典列表
export const getDictionaryItems = async (type: DictionaryType) => {
  const tableExists = await checkTableExists('dictionary');
  if (!tableExists) {
    throw new Error("数据库表 'dictionary' 不存在。请联系管理员初始化数据库。");
  }

  const { data, error } = await supabase
    .from('dictionary')
    .select('id, code, name, type, description, sort_order, extra_data, is_active, created_at, updated_at')
    .eq('type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

// 获取单个数据字典项
export const getDictionaryItem = async (id: string) => {
  const { data, error } = await supabase
    .from('dictionary')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// 创建数据字典项
export const createDictionaryItem = async (item: Omit<DictionaryItem, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('dictionary')
    .insert(item)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// 更新数据字典项
export const updateDictionaryItem = async (id: string, item: Partial<DictionaryItem>) => {
  const { data, error } = await supabase
    .from('dictionary')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// 删除数据字典项（软删除，设置is_active为false）
export const deleteDictionaryItem = async (id: string) => {
  const { error } = await supabase
    .from('dictionary')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

// 硬删除数据字典项
export const hardDeleteDictionaryItem = async (id: string) => {
  const { error } = await supabase
    .from('dictionary')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

// 批量导入数据字典
export const importDictionaryData = async (type: DictionaryType, data: Omit<DictionaryItem, 'id' | 'created_at' | 'updated_at'>[]) => {
  const itemsWithType = data.map(item => ({ ...item, type }));

  const { error } = await supabase
    .from('dictionary')
    .insert(itemsWithType);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

// 导出数据字典
export const exportDictionaryData = async (type: DictionaryType) => {
  const { data, error } = await supabase
    .from('dictionary')
    .select('*')
    .eq('type', type)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return;
  }

  // 转换为CSV格式
  const headers = ['code', 'name', 'description', 'extra_data', 'sort_order'];
  const rows = data.map(item => [
    item.code,
    item.name,
    item.description || '',
    JSON.stringify(item.extra_data || {}),
    item.sort_order || 0
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
  link.setAttribute('download', `dictionary_${type}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 数据字典类型配置
export const dictionaryTypeConfig: Record<DictionaryType, { name: string; description: string; extraFields: { key: string; label: string; type: 'text' | 'number' | 'json' }[] }> = {
  base_station: {
    name: '基站',
    description: '无人机基站配置',
    extraFields: [
      { key: 'area_id', label: '所属区域', type: 'text' },
      { key: 'responsible_person', label: '责任人', type: 'text' },
      { key: 'contact_phone', label: '联系电话', type: 'text' },
      { key: 'is_enabled', label: '启用状态', type: 'text' }
    ]
  },
  route: {
    name: '航线',
    description: '无人机飞行航线配置',
    extraFields: [
      { key: 'base_station_id', label: '所属基站', type: 'text' },
      { key: 'length', label: '长度（公里）', type: 'number' },
      { key: 'estimated_time', label: '预计耗时（分钟）', type: 'number' },
      { key: 'is_enabled', label: '启用状态', type: 'text' }
    ]
  },
  coverage_area: {
    name: '覆盖范围',
    description: '责任区覆盖范围配置',
    extraFields: [
      { key: 'parent_id', label: '上级区域', type: 'text' },
      { key: 'is_enabled', label: '启用状态', type: 'text' }
    ]
  },
  responsible_unit: {
    name: '责任单位',
    description: '管理责任单位配置',
    extraFields: [
      { key: 'unit_type', label: '单位类型', type: 'text' },
      { key: 'contact', label: '联系人', type: 'text' },
      { key: 'phone', label: '联系电话', type: 'text' },
      { key: 'email', label: '电子邮箱', type: 'text' },
      { key: 'is_enabled', label: '启用状态', type: 'text' }
    ]
  },
  pollution_type: {
    name: '污染源类型',
    description: '污染源类型配置',
    extraFields: [
      { key: 'parent_id', label: '上级类型', type: 'text' },
      { key: 'severity', label: '严重程度默认值', type: 'text' },
      { key: 'is_enabled', label: '启用状态', type: 'text' }
    ]
  },
  inspection_config: {
    name: '巡查次数配置',
    description: '巡查次数配置',
    extraFields: [
      { key: 'year', label: '配置年份', type: 'number' },
      { key: 'object_type', label: '配置对象类型', type: 'text' },
      { key: 'object_id', label: '对象名称', type: 'number' },
      { key: 'plan_count', label: '计划巡查次数', type: 'number' },
      { key: 'quarterly_breakdown', label: '季度分解', type: 'text' },
      { key: 'Q1', label: 'Q1', type: 'number' },
      { key: 'Q2', label: 'Q2', type: 'number' },
      { key: 'Q3', label: 'Q3', type: 'number' },
      { key: 'Q4', label: 'Q4', type: 'number' },
      { key: 'remark', label: '备注', type: 'text' }
    ]
  }
};

// ============ 向后兼容的API（保留原有函数名，内部调用新的统一接口） ============

// 基地类型定义（保留以兼容旧代码）
export interface Base {
  id?: string;
  name: string;
  code: string;
  area_id: string;
  responsible_person?: string;
  contact_phone?: string;
  is_enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 航线类型定义（保留以兼容旧代码）
export interface Route {
  id?: string;
  name: string;
  code: string;
  base_id: string;
  length: number;
  estimated_time?: number;
  is_enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 责任区类型定义（保留以兼容旧代码）
export interface Area {
  id?: string;
  name: string;
  code: string;
  parent_id: string;
  level: number;
  is_enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 兼容旧代码：获取基站列表
export const getBases = async () => {
  const items = await getDictionaryItems('base_station');
  return items.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    area_id: item.extra_data?.area_id || '',
    responsible_person: item.extra_data?.responsible_person || '',
    contact_phone: item.extra_data?.contact_phone || '',
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  })) as Base[];
};

// 兼容旧代码：获取航线列表
export const getRoutes = async (baseId?: string) => {
  let items = await getDictionaryItems('route');
  if (baseId) {
    items = items.filter(item => item.extra_data?.base_station_id === baseId);
  }
  return items.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    base_id: item.extra_data?.base_station_id || '',
    length: item.extra_data?.length || 0,
    estimated_time: item.extra_data?.estimated_time || undefined,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  })) as Route[];
};

// 兼容旧代码：获取责任区列表
export const getAreas = async (parentId?: string) => {
  let items = await getDictionaryItems('coverage_area');
  if (parentId) {
    items = items.filter(item => item.extra_data?.parent_id === parentId);
  }
  return items.map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    parent_id: item.extra_data?.parent_id || '',
    level: item.extra_data?.level || 1,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  })) as Area[];
};

// 兼容旧代码：创建基地
export const createBase = async (base: Omit<Base, 'id' | 'created_at' | 'updated_at'>) => {
  const item = await createDictionaryItem({
    type: 'base_station',
    code: base.code,
    name: base.name,
    description: base.description,
    extra_data: {
      area_id: base.area_id,
      responsible_person: base.responsible_person || '',
      contact_phone: base.contact_phone || '',
      is_enabled: base.is_enabled.toString()
    },
    is_active: true,
    sort_order: 0
  });
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    area_id: base.area_id,
    responsible_person: base.responsible_person || '',
    contact_phone: base.contact_phone || '',
    is_enabled: base.is_enabled,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Base;
};

// 兼容旧代码：更新基地
export const updateBase = async (id: string, base: Partial<Base>) => {
  const updateData: Partial<DictionaryItem> = {};
  if (base.name) updateData.name = base.name;
  if (base.code) updateData.code = base.code;
  if (base.description !== undefined) updateData.description = base.description;
  if (base.area_id || base.responsible_person !== undefined || base.contact_phone !== undefined || base.is_enabled !== undefined) {
    updateData.extra_data = {
      area_id: base.area_id || '',
      responsible_person: base.responsible_person || '',
      contact_phone: base.contact_phone || '',
      is_enabled: base.is_enabled?.toString() || 'false'
    };
  }
  const item = await updateDictionaryItem(id, updateData);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    area_id: item.extra_data?.area_id || '',
    responsible_person: item.extra_data?.responsible_person || '',
    contact_phone: item.extra_data?.contact_phone || '',
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Base;
};

// 兼容旧代码：删除基地
export const deleteBase = async (id: string) => {
  return await deleteDictionaryItem(id);
};

// 兼容旧代码：创建航线
export const createRoute = async (route: Omit<Route, 'id' | 'created_at' | 'updated_at'>) => {
  const item = await createDictionaryItem({
    type: 'route',
    code: route.code,
    name: route.name,
    description: route.description,
    extra_data: {
      length: route.length,
      base_station_id: route.base_id,
      estimated_time: route.estimated_time || 0,
      is_enabled: route.is_enabled.toString()
    },
    is_active: true,
    sort_order: 0
  });
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    base_id: route.base_id,
    length: route.length,
    estimated_time: route.estimated_time,
    is_enabled: route.is_enabled,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Route;
};

// 兼容旧代码：更新航线
export const updateRoute = async (id: string, route: Partial<Route>) => {
  const updateData: Partial<DictionaryItem> = {};
  if (route.name) updateData.name = route.name;
  if (route.code) updateData.code = route.code;
  if (route.description !== undefined) updateData.description = route.description;
  if (route.length !== undefined || route.base_id || route.estimated_time !== undefined || route.is_enabled !== undefined) {
    updateData.extra_data = {
      length: route.length || 0,
      base_station_id: route.base_id || '',
      estimated_time: route.estimated_time || 0,
      is_enabled: route.is_enabled?.toString() || 'false'
    };
  }
  const item = await updateDictionaryItem(id, updateData);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    base_id: item.extra_data?.base_station_id || '',
    length: item.extra_data?.length || 0,
    estimated_time: item.extra_data?.estimated_time || undefined,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Route;
};

// 兼容旧代码：删除航线
export const deleteRoute = async (id: string) => {
  return await deleteDictionaryItem(id);
};

// 兼容旧代码：创建责任区
export const createArea = async (area: Omit<Area, 'id' | 'created_at' | 'updated_at'>) => {
  const item = await createDictionaryItem({
    type: 'coverage_area',
    code: area.code,
    name: area.name,
    description: area.description,
    extra_data: {
      parent_id: area.parent_id,
      level: area.level,
      is_enabled: area.is_enabled.toString()
    },
    is_active: true,
    sort_order: 0
  });
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    parent_id: area.parent_id,
    level: area.level,
    is_enabled: area.is_enabled,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Area;
};

// 兼容旧代码：更新责任区
export const updateArea = async (id: string, area: Partial<Area>) => {
  const updateData: Partial<DictionaryItem> = {};
  if (area.name) updateData.name = area.name;
  if (area.code) updateData.code = area.code;
  if (area.description !== undefined) updateData.description = area.description;
  if (area.parent_id || area.level !== undefined || area.is_enabled !== undefined) {
    updateData.extra_data = {
      parent_id: area.parent_id || '',
      level: area.level || 1,
      is_enabled: area.is_enabled?.toString() || 'false'
    };
  }
  const item = await updateDictionaryItem(id, updateData);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    parent_id: item.extra_data?.parent_id || '',
    level: item.extra_data?.level || 1,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Area;
};

// 兼容旧代码：删除责任区
export const deleteArea = async (id: string) => {
  return await deleteDictionaryItem(id);
};

// 兼容旧代码：获取单个基地
export const getBase = async (id: string) => {
  const item = await getDictionaryItem(id);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    area_id: item.extra_data?.area_id || '',
    responsible_person: item.extra_data?.responsible_person || '',
    contact_phone: item.extra_data?.contact_phone || '',
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Base;
};

// 兼容旧代码：获取单个航线
export const getRoute = async (id: string) => {
  const item = await getDictionaryItem(id);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    base_id: item.extra_data?.base_station_id || '',
    length: item.extra_data?.length || 0,
    estimated_time: item.extra_data?.estimated_time || undefined,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Route;
};

// 兼容旧代码：获取单个责任区
export const getArea = async (id: string) => {
  const item = await getDictionaryItem(id);
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    parent_id: item.extra_data?.parent_id || '',
    level: item.extra_data?.level || 1,
    is_enabled: item.extra_data?.is_enabled === 'true' || false,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at
  } as Area;
};
