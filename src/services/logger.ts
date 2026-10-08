export interface LogEvent {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  category: 'bot' | 'sheets' | 'api' | 'system';
  message: string;
  details?: string;
}

class SystemLogger {
  private logs: LogEvent[] = [];
  private readonly MAX_LOGS = 60;

  constructor() {
    // Seed initial system startup event
    this.log({
      level: 'info',
      category: 'system',
      message: 'Course Bazar application initialized.',
      details: 'Node.js Express + Telegraf engine boot completed.'
    });
  }

  public log(event: Omit<LogEvent, 'id' | 'timestamp'>) {
    const newLog: LogEvent = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    this.logs.unshift(newLog);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.length = this.MAX_LOGS;
    }
  }

  public getRecentLogs(limit = 20): LogEvent[] {
    return this.logs.slice(0, Math.min(limit, this.MAX_LOGS));
  }

  public clear() {
    this.logs = [];
  }

  public deleteLog(id: string) {
    this.logs = this.logs.filter((l) => l.id !== id);
  }
}

export const systemLogger = new SystemLogger();
