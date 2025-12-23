
export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'NET' | 'GAME';

export interface LogEntry {
    id: string;
    timestamp: number;
    type: LogType;
    message: string;
}

class LoggerService {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private maxLogs = 100;

    log(type: LogType, message: string) {
        const entry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            type,
            message
        };
        
        this.logs.unshift(entry); // Add to top
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        // Console fallback
        const style = type === 'ERROR' ? 'color: red' : (type === 'WARN' ? 'color: orange' : 'color: #00f3ff');
        console.log(`%c[${type}] ${message}`, style);

        this.notify();
    }

    info(msg: string) { this.log('INFO', msg); }
    warn(msg: string) { this.log('WARN', msg); }
    error(msg: string) { this.log('ERROR', msg); }
    net(msg: string) { this.log('NET', msg); }
    game(msg: string) { this.log('GAME', msg); }

    getLogs() { return this.logs; }

    subscribe(callback: (logs: LogEntry[]) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.logs));
    }
}

export const Logger = new LoggerService();
