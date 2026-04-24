-- 创建任务转发表
CREATE TABLE IF NOT EXISTS task_forwards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
    forward_to TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    template TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}',
    screenshots TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'processing', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    due_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_forwards_report_id ON task_forwards(report_id);
CREATE INDEX IF NOT EXISTS idx_task_forwards_status ON task_forwards(status);
CREATE INDEX IF NOT EXISTS idx_task_forwards_created_by ON task_forwards(created_by);
CREATE INDEX IF NOT EXISTS idx_task_forwards_created_at ON task_forwards(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_task_forwards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_forwards_updated_at_trigger ON task_forwards;
CREATE TRIGGER update_task_forwards_updated_at_trigger
    BEFORE UPDATE ON task_forwards
    FOR EACH ROW
    EXECUTE FUNCTION update_task_forwards_updated_at();

-- 启用 RLS
ALTER TABLE task_forwards ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS task_forwards_select_policy ON task_forwards;
DROP POLICY IF EXISTS task_forwards_insert_policy ON task_forwards;
DROP POLICY IF EXISTS task_forwards_update_policy ON task_forwards;
DROP POLICY IF EXISTS task_forwards_delete_policy ON task_forwards;

-- 允许所有用户查看转发记录
CREATE POLICY task_forwards_select_policy ON task_forwards
    FOR SELECT USING (true);

-- 允许已登录用户创建转发记录
CREATE POLICY task_forwards_insert_policy ON task_forwards
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 允许创建者或管理员更新转发记录
CREATE POLICY task_forwards_update_policy ON task_forwards
    FOR UPDATE USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 允许创建者或管理员删除转发记录
CREATE POLICY task_forwards_delete_policy ON task_forwards
    FOR DELETE USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 创建操作日志记录函数
CREATE OR REPLACE FUNCTION log_task_forward_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 当状态变化时，记录到操作日志
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO operation_logs (
            action_type,
            target_type,
            target_id,
            target_name,
            old_values,
            new_values,
            user_id,
            username,
            description
        ) VALUES (
            'UPDATE',
            'TASK_FORWARD',
            NEW.id::TEXT,
            NEW.forward_to,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            COALESCE(auth.uid(), NEW.created_by),
            (SELECT username FROM profiles WHERE id = COALESCE(auth.uid(), NEW.created_by) LIMIT 1),
            '任务转发状态变更: ' || OLD.status || ' -> ' || NEW.status
        );

        -- 更新时间戳字段
        IF NEW.status = 'received' AND OLD.status = 'pending' THEN
            NEW.received_at = COALESCE(NEW.received_at, NOW());
        ELSIF NEW.status = 'resolved' AND OLD.status IN ('received', 'processing') THEN
            NEW.resolved_at = COALESCE(NEW.resolved_at, NOW());
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS task_forward_change_trigger ON task_forwards;
CREATE TRIGGER task_forward_change_trigger
    BEFORE UPDATE ON task_forwards
    FOR EACH ROW
    EXECUTE FUNCTION log_task_forward_change();

-- 添加表注释
COMMENT ON TABLE task_forwards IS '任务转发表，用于管理巡查发现问题的转发处理';
COMMENT ON COLUMN task_forwards.report_id IS '关联的巡查报告ID';
COMMENT ON COLUMN task_forwards.forward_to IS '责任单位名称';
COMMENT ON COLUMN task_forwards.contact_person IS '联系人姓名';
COMMENT ON COLUMN task_forwards.contact_phone IS '联系电话';
COMMENT ON COLUMN task_forwards.template IS '转发模板内容';
COMMENT ON COLUMN task_forwards.photos IS '问题照片URL数组';
COMMENT ON COLUMN task_forwards.screenshots IS '缺陷截图URL数组';
COMMENT ON COLUMN task_forwards.status IS '状态: pending待发送, received已接收, processing处理中, resolved已解决, closed已关闭';
COMMENT ON COLUMN task_forwards.priority IS '优先级: high高, medium中, low低';
COMMENT ON COLUMN task_forwards.due_date IS '处理期限';
COMMENT ON COLUMN task_forwards.resolution_notes IS '处理结果说明';
