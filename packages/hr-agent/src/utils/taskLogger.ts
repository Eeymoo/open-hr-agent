import fs from 'node:fs';
import path from 'node:path';

/**
 * 任务日志条目接口
 */
export interface TaskLogEntry {
  /** 任务 ID */
  taskId: number;
  /** 任务名称 */
  taskName: string;
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 任务日志记录器
 * 用于记录任务执行过程中的日志信息，支持不同级别的日志输出
 */
export class TaskLogger {
  /** 日志文件目录 */
  private logDir: string;
  /** 当前日志级别 */
  private currentLogLevel: 'info' | 'warn' | 'error';

  /**
   * 创建任务日志记录器
   * @param logDir - 日志文件目录，默认为 './logs/tasks'
   * @param logLevel - 日志级别，默认为 'info'
   */
  constructor(logDir: string = './logs/tasks', logLevel: 'info' | 'warn' | 'error' = 'info') {
    this.logDir = logDir;
    this.currentLogLevel = logLevel;
    this.ensureLogDir();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 获取任务的日志文件路径
   * @param taskId - 任务 ID
   * @returns 日志文件完整路径
   */
  private getLogFile(taskId: number): string {
    const [date] = new Date().toISOString().split('T');
    return path.join(this.logDir, `${date}_task_${taskId}.log`);
  }

  /**
   * 判断是否应该记录该级别的日志
   * @param level - 日志级别
   * @returns 是否应该记录
   */
  private shouldLog(level: 'info' | 'warn' | 'error'): boolean {
    const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.currentLogLevel);
  }

  /**
   * 格式化日志条目
   * @param entry - 日志条目
   * @returns 格式化后的日志字符串
   */
  private formatLogEntry(entry: TaskLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.taskName}] [Task#${entry.taskId}] ${entry.message}${dataStr}\n`;
  }

  /**
   * 记录日志
   * @param entry - 日志条目
   */
  async log(entry: TaskLogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logFile = this.getLogFile(entry.taskId);
    const logLine = this.formatLogEntry(entry);

    await fs.promises.appendFile(logFile, logLine);
  }

  /**
   * 记录 info 级别日志
   * @param taskId - 任务 ID
   * @param taskName - 任务名称
   * @param message - 日志消息
   * @param data - 附加数据
   */
  async info(
    taskId: number,
    taskName: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      taskName,
      timestamp: Date.now(),
      level: 'info',
      message,
      data
    });
  }

  /**
   * 记录 warn 级别日志
   * @param taskId - 任务 ID
   * @param taskName - 任务名称
   * @param message - 日志消息
   * @param data - 附加数据
   */
  async warn(
    taskId: number,
    taskName: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      taskName,
      timestamp: Date.now(),
      level: 'warn',
      message,
      data
    });
  }

  /**
   * 记录 error 级别日志
   * @param taskId - 任务 ID
   * @param taskName - 任务名称
   * @param message - 日志消息
   * @param data - 附加数据
   */
  async error(
    taskId: number,
    taskName: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      taskName,
      timestamp: Date.now(),
      level: 'error',
      message,
      data
    });
  }
}
