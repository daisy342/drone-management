#!/bin/bash

# Supabase 迁移脚本
# 自动加载 .env 文件中的 SUPABASE_DB_PASSWORD

set -e

# 加载 .env 文件
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 检查环境变量
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "错误: SUPABASE_DB_PASSWORD 未设置"
  exit 1
fi

# 执行 supabase 命令
supabase "$@" --project-ref qamqyjpbdtoylwnxhrfm
