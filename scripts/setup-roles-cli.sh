#!/bin/bash

echo "使用 Supabase CLI 创建 roles 表..."
echo ""

# 检查 supabase CLI 是否安装
if ! command -v npx &> /dev/null; then
    echo "❌ npx 未找到，请先安装 Node.js"
    exit 1
fi

# 检查是否已登录
echo "1. 检查 Supabase CLI 登录状态..."
npx supabase projects list &> /dev/null
if [ $? -ne 0 ]; then
    echo "   未登录，需要登录..."
    echo ""
    echo "请在浏览器中完成登录："
    npx supabase login
else
    echo "   ✅ 已登录"
fi

echo ""
echo "2. 链接到远程项目..."
echo "   项目 ID: qamqyjpbdtoylwnxhrfm"
npx supabase link --project-ref qamqyjpbdtoylwnxhrfm

if [ $? -ne 0 ]; then
    echo "❌ 链接项目失败"
    exit 1
fi

echo ""
echo "3. 执行数据库迁移..."
npx supabase db push

if [ $? -ne 0 ]; then
    echo "❌ 执行迁移失败"
    exit 1
fi

echo ""
echo "✅ roles 表创建成功！"
echo ""
echo "验证表是否存在："
npx supabase db query "SELECT id, name, code FROM roles LIMIT 5;"
