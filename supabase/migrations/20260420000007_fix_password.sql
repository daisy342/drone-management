-- 直接重置所有用户的密码为 123456

-- 确保 pgcrypto 扩展已安装
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 更新张三的密码
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = '__@example.com';

-- 验证更新结果
SELECT email, encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = '__@example.com';
