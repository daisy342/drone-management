-- 添加 screenshots 列到 task_forwards 表
ALTER TABLE task_forwards
ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT '{}';

-- 添加列注释
COMMENT ON COLUMN task_forwards.screenshots IS '缺陷截图URL数组';
