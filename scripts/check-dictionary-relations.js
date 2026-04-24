import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('请设置 VITE_SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAndFixDictionary() {
  try {
    // 1. 查询所有覆盖区域
    const { data: coverageAreas, error: areaError } = await supabase
      .from('dictionary')
      .select('id, code, name, extra_data')
      .eq('type', 'coverage_area')
      .eq('is_active', true);

    if (areaError) throw areaError;

    console.log('=== 覆盖区域 ===');
    coverageAreas?.forEach(area => {
      console.log(`ID: ${area.id}, 名称: ${area.name}, Code: ${area.code}`);
    });

    // 2. 查询所有基站
    const { data: baseStations, error: baseError } = await supabase
      .from('dictionary')
      .select('id, code, name, extra_data')
      .eq('type', 'base_station')
      .eq('is_active', true);

    if (baseError) throw baseError;

    console.log('\n=== 基站 ===');
    baseStations?.forEach(base => {
      console.log(`ID: ${base.id}, 名称: ${base.name}, Code: ${base.code}`);
      console.log(`  extra_data:`, base.extra_data);
    });

    // 3. 检查礼嘉站是否正确关联礼嘉区域
    const lijiaArea = coverageAreas?.find(a => a.name === '礼嘉');
    const lijiaBase = baseStations?.find(b => b.name === '礼嘉站');

    if (lijiaArea && lijiaBase) {
      console.log('\n=== 礼嘉关联检查 ===');
      console.log(`礼嘉区域 ID: ${lijiaArea.id}`);
      console.log(`礼嘉站 extra_data.coverage_area_id: ${lijiaBase.extra_data?.coverage_area_id}`);

      if (lijiaBase.extra_data?.coverage_area_id === lijiaArea.id) {
        console.log('✅ 礼嘉站已正确关联礼嘉区域');
      } else {
        console.log('❌ 礼嘉站未正确关联礼嘉区域，需要修复');

        // 修复关联关系
        const { error: updateError } = await supabase
          .from('dictionary')
          .update({
            extra_data: {
              ...lijiaBase.extra_data,
              coverage_area_id: lijiaArea.id
            }
          })
          .eq('id', lijiaBase.id);

        if (updateError) {
          console.error('修复失败:', updateError.message);
        } else {
          console.log('✅ 已修复礼嘉站的关联关系');
        }
      }
    } else {
      if (!lijiaArea) console.log('❌ 未找到礼嘉区域');
      if (!lijiaBase) console.log('❌ 未找到礼嘉站');
    }

    // 4. 查询所有航线
    const { data: routes, error: routeError } = await supabase
      .from('dictionary')
      .select('id, code, name, extra_data')
      .eq('type', 'route')
      .eq('is_active', true);

    if (routeError) throw routeError;

    console.log('\n=== 航线 ===');
    routes?.forEach(route => {
      console.log(`ID: ${route.id}, 名称: ${route.name}, Code: ${route.code}`);
      console.log(`  extra_data:`, route.extra_data);
    });

  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

checkAndFixDictionary();
