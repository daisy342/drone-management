# 多任务并发执行指南

## 快速开始

### 方法 1: 使用 Worktree（完全隔离）

每个对话框创建一个独立的工作目录：

```bash
# 在对话框 1 中
git worktree add ../rizhi-task1 -b feature/task1
cd ../rizhi-task1

# 在对话框 2 中
git worktree add ../rizhi-task2 -b feature/task2  
cd ../rizhi-task2
```

或者在 Claude 中直接说：
- "帮我创建一个 worktree 用于开发新功能"
- "EnterWorktree" 

### 方法 2: 分支隔离（推荐用于小任务）

```bash
# 对话框 1
git checkout -b feature/update-ui

# 对话框 2  
git checkout -b feature/fix-bug
```

完成后合并：
```bash
git checkout main
git merge feature/update-ui
git merge feature/fix-bug
```

### 方法 3: Stash 临时保存

快速切换任务：
```bash
git stash push -m "任务1进度"
git checkout -b feature/任务2
# ... 完成任务2 ...
git checkout 任务1分支
git stash pop
```

## 最佳实践

1. **开始前先创建分支/工作目录**，避免污染主分支
2. **使用描述性的分支名**，如 `feature/add-login`、`fix/navbar-style`
3. **定期提交**，即使功能未完成也可以用 `git commit -m "WIP: xxx"`
4. **合并前先做代码审查**，使用 `git diff main...feature/xxx`

## 清理工作目录

```bash
# 删除 worktree
git worktree remove ../rizhi-task1
git branch -d feature/task1
```
