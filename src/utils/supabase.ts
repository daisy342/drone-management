import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置，如果没有则使用默认值
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qamqyjpbdtoylwnxhrfm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nL04j1RW_28LJF1wKwsfAw_xmVlgum4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});
