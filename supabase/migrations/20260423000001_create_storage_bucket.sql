-- 创建 log-photos 存储桶
insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', true)
on conflict (id) do nothing;

-- 允许所有已登录用户上传文件
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'log-photos');

-- 允许所有已登录用户读取文件
CREATE POLICY "Allow authenticated select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'log-photos');

-- 允许所有已登录用户删除自己的文件
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'log-photos');
