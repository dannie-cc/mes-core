import { Injectable, LoggerService, Scope } from '@nestjs/common';
import Logger, { LOG_LEVEL } from './logger';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
    private logger: Logger;
    private context?: string;

    constructor() {
        this.logger = new Logger();
        this.logger.setLevel(LOG_LEVEL.INFO);
    }

    setContext(context: string) {
        this.context = context;
        return this;
    }

    private formatMessage(message: string): string {
        return this.context ? `[${this.context}] ${message}` : message;
    }

    log(message: string, ...args: any[]) {
        this.logger.info(this.formatMessage(message), ...args);
    }

    error(message: string, ...args: any[]) {
        this.logger.error(this.formatMessage(message), ...args);
    }

    warn(message: string, ...args: any[]) {
        this.logger.warn(this.formatMessage(message), ...args);
    }

    debug(message: string, ...args: any[]) {
        this.logger.debug(this.formatMessage(message), ...args);
    }

    verbose(message: string, ...args: any[]) {
        this.logger.debug(this.formatMessage(message), ...args);
    }
}
