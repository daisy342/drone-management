import { fileManager } from './fileManager';

// 使用示例
async function modifyFilesExample() {
  // 要修改的文件列表
  const filesToModify = ['/Users/daishuyao/Documents/trae_projects/rizhi/src/views/Home.tsx', '/Users/daishuyao/Documents/trae_projects/rizhi/src/views/Home.css'];

  // 1. 检查冲突
  const hasConflict = fileManager.checkConflict(filesToModify);

  if (hasConflict) {
    return;
  }

  // 2. 开始任务
  const startResult = fileManager.startTask(filesToModify);

  if (!startResult.success) {
    return;
  }

  try {
    // 3. 执行文件修改操作
    // 这里放置实际的文件修改代码
    // 例如：fs.writeFileSync(filePath, newContent);

    // 模拟修改过程
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    // 处理错误
  } finally {
    // 4. 完成任务，释放文件占用
    if (startResult.taskId) {
      fileManager.completeTask(startResult.taskId);
    }
  }
}

// 清理过期任务
function cleanExpiredTasksExample() {
  fileManager.cleanExpiredTasks();
}

// 获取任务状态
function getTasksStatusExample() {
  const inProgressTasks = fileManager.getInProgressTasks();
  const completedTasks = fileManager.getCompletedTasks();
}

// 导出示例函数
export { modifyFilesExample, cleanExpiredTasksExample, getTasksStatusExample };

// 运行示例
if (require.main === module) {
  // 清理过期任务
  cleanExpiredTasksExample();

  // 获取任务状态
  getTasksStatusExample();

  // 执行文件修改示例
  modifyFilesExample();
}
