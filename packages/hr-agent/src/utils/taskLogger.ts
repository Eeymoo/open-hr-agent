import fs from 'node:fs';
import path from 'node:path';

export interface TaskLogEntry {
  taskId: number;
  taskName: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export class TaskLogger {
  private logDir: string;
  private currentLogLevel: 'info' | 'warn' | 'error';

  constructor(logDir: string = './logs/tasks', logLevel: 'info' | 'warn' | 'error' = 'info') {
    this.logDir = logDir;
    this.currentLogLevel = logLevel;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFile(taskId: number): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${date}_task_${taskId}.log`);
  }

  private shouldLog(level: 'info' | 'warn' | 'error'): boolean {
    const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.currentLogLevel);
  }

  private formatLogEntry(entry: TaskLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.taskName}] [Task#${entry.taskId}] ${entry.message}${dataStr}\n`;
  }

  async log(entry: TaskLogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logFile = this.getLogFile(entry.taskId);
    const logLine = this.formatLogEntry(entry);

    await fs.promises.appendFile(logFile, logLine);
  }

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
