-- 为 profiles 表添加联系方式字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- 添加注释
COMMENT ON COLUMN profiles.contact_info IS '用户联系方式，电话或邮箱';
