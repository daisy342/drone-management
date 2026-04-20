-- 为 profiles 表添加 description 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
