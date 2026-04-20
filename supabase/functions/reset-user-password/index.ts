import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 创建 Supabase 客户端（使用 service role key）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 获取请求体
    const { userId, newPassword } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: '缺少用户ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 更新用户密码
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword || '123456' }
    )

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: '密码重置成功' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
