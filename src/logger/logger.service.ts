import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import logger, { initLogStore } from './logic';

@Injectable({ scope: Scope.REQUEST })
export class CustomLogger implements LoggerService {
  constructor(@Inject(CONTEXT) private context?: any) {
    initLogStore();
  }

  private loggerTag = 'NESTCLI';

  private wrappedLog = (
    message: any,
    tag: string,
    options = { stringify: false },
  ) => {
    const traceId = this?.context?.req.trace?.reqId;
    const _tag = `${tag}${traceId ? "::" + traceId : ""}`;
    const _message = options.stringify && typeof message === 'object' ? JSON.stringify(message) : message;
    return logger.show(`${_tag}::${_message}`, this.loggerTag);
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
  debug(message: any, tag = 'debug') {
    this.wrappedLog(message, tag);
  }
  verbose(message: string, tag = 'verbose', extraTag?: string) {
    this.wrappedLog(message, tag);
  }
}

export const CustomLoggerInstance = new CustomLogger();
