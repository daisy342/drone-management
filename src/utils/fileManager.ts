import fs from 'fs';
import path from 'path';

// 任务状态接口
interface Task {
  id: string;
  files: string[];
  status: 'pending' | 'in_progress' | 'completed';
  startTime: Date;
  endTime?: Date;
}

// 中间层管理器
class FileManager {
  private tasksFile: string;
  private tasks: Task[];

  constructor() {
    this.tasksFile = path.join(__dirname, '../../task_manager.json');
    this.tasks = this.loadTasks();
  }

  // 加载任务列表
  private loadTasks(): Task[] {
    try {
      if (fs.existsSync(this.tasksFile)) {
        const data = fs.readFileSync(this.tasksFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to load tasks:', error);
      return [];
    }
  }

  // 保存任务列表
  private saveTasks(): void {
    try {
      fs.writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  }

  // 生成唯一任务ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 检查文件是否被占用
  checkConflict(files: string[]): boolean {
    const inProgressTasks = this.tasks.filter(task => task.status === 'in_progress');
    
    for (const task of inProgressTasks) {
      for (const file of files) {
        if (task.files.includes(file)) {
          return true;
        }
      }
    }
    
    return false;
  }

  // 开始任务
  startTask(files: string[]): { success: boolean; taskId?: string; message?: string } {
    if (this.checkConflict(files)) {
      return { 
        success: false, 
        message: 'Some files are currently being modified. Please wait for the other task to complete.' 
      };
    }

    const taskId = this.generateTaskId();
    const newTask: Task = {
      id: taskId,
      files,
      status: 'in_progress',
      startTime: new Date()
    };

    this.tasks.push(newTask);
    this.saveTasks();

    return { success: true, taskId };
  }

  // 完成任务
  completeTask(taskId: string): boolean {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return false;
    }

    this.tasks[taskIndex].status = 'completed';
    this.tasks[taskIndex].endTime = new Date();
    this.saveTasks();

    return true;
  }

  // 获取当前正在进行的任务
  getInProgressTasks(): Task[] {
    return this.tasks.filter(task => task.status === 'in_progress');
  }

  // 获取已完成的任务
  getCompletedTasks(): Task[] {
    return this.tasks.filter(task => task.status === 'completed');
  }

  // 清理过期任务（超过24小时的正在进行任务）
  cleanExpiredTasks(): void {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.tasks = this.tasks.filter(task => {
      if (task.status === 'in_progress') {
        return new Date(task.startTime) > twentyFourHoursAgo;
      }
      return true;
    });

    this.saveTasks();
  }
}

// 导出单例实例
export const fileManager = new FileManager();
