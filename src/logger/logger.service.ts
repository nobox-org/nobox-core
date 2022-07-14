import { Injectable, LoggerService, Scope } from '@nestjs/common';
import logger, { initLogStore } from './logic';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  constructor() {
    initLogStore();
  }

  private loggerTag = 'NESTCLI';

  private wrappedLog = (
    message: string | Record<string, any>,
    tag,
    options = { stringify: false },
  ) => {
    if (options.stringify && typeof message === 'object') {
      return logger.show(`${tag}::${JSON.stringify(message)}`, this.loggerTag);
    }
    const taggedMessage = `${tag}::${message}`;
    return logger.show(taggedMessage, this.loggerTag);
  };

  log(message: string, tag = 'simple') {
    this.wrappedLog(message, tag);
  }

  sLog(message: Record<string, any>, tag = 'simple') {
    this.wrappedLog(message, tag, { stringify: true });
  }

  error(message: string, trace = '', tag = 'error') {
    this.wrappedLog({ trace }, tag, { stringify: true });
    this.wrappedLog(message, tag);
  }
  warn(message: string, tag = 'warning') {
    this.wrappedLog(message, tag);
  }
  debug(message: string, tag = 'debug') {
    this.wrappedLog(message, tag);
  }
  verbose(message: string, tag = 'verbose') {
    this.wrappedLog(message, tag);
  }
}

export const CustomLoggerInstance = new CustomLogger();
