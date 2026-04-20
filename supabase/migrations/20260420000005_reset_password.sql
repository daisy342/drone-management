-- 重置用户密码为 123456
-- 通过直接更新 auth.users 表的 encrypted_password 字段

-- 首先需要安装 pgcrypto 扩展（如果还没有安装）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 更新指定用户的密码
-- 使用 crypt 函数加密密码，'bf' 表示使用 bcrypt 算法
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = '__@example.com';

-- 如果要重置所有用户的密码为 123456，使用下面的语句（谨慎使用）
-- UPDATE auth.users
-- SET encrypted_password = crypt('123456', gen_salt('bf'));

-- 验证更新结果
SELECT id, email, encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = '__@example.com';
