-- 创建重置密码的数据库函数
CREATE OR REPLACE FUNCTION reset_user_password(user_id UUID, new_password TEXT DEFAULT '123456')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查用户是否存在
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN '用户不存在';
  END IF;

  -- 更新密码
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = user_id;

  RETURN '密码重置成功';
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_password(UUID, TEXT) TO anon;
