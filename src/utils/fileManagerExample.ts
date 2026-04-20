import { fileManager } from './fileManager';

// 使用示例
async function modifyFilesExample() {
  // 要修改的文件列表
  const filesToModify = ['/Users/daishuyao/Documents/trae_projects/rizhi/src/views/Home.tsx', '/Users/daishuyao/Documents/trae_projects/rizhi/src/views/Home.css'];

  // 1. 检查冲突
  const hasConflict = fileManager.checkConflict(filesToModify);
  
  if (hasConflict) {
    console.log('冲突检测：文件正在被其他任务修改，请等待完成后再操作。');
    return;
  }

  // 2. 开始任务
  const startResult = fileManager.startTask(filesToModify);
  
  if (!startResult.success) {
    console.log('任务启动失败：', startResult.message);
    return;
  }

  console.log('任务启动成功，任务ID：', startResult.taskId);

  try {
    // 3. 执行文件修改操作
    console.log('开始修改文件...');
    // 这里放置实际的文件修改代码
    // 例如：fs.writeFileSync(filePath, newContent);
    
    // 模拟修改过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('文件修改完成');

  } catch (error) {
    console.error('文件修改失败：', error);
  } finally {
    // 4. 完成任务，释放文件占用
    if (startResult.taskId) {
      const completeResult = fileManager.completeTask(startResult.taskId);
      if (completeResult) {
        console.log('任务完成，文件占用已释放');
      } else {
        console.log('任务完成失败');
      }
    }
  }
}

// 清理过期任务
function cleanExpiredTasksExample() {
  fileManager.cleanExpiredTasks();
  console.log('过期任务已清理');
}

// 获取任务状态
function getTasksStatusExample() {
  const inProgressTasks = fileManager.getInProgressTasks();
  const completedTasks = fileManager.getCompletedTasks();
  
  console.log('正在进行的任务：', inProgressTasks.length);
  inProgressTasks.forEach(task => {
    console.log(`- 任务ID: ${task.id}, 文件: ${task.files.join(', ')}`);
  });
  
  console.log('已完成的任务：', completedTasks.length);
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
