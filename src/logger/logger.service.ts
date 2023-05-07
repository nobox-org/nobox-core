
import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import * as chalk from 'chalk';
import { type ForegroundColor, type BackgroundColor } from 'chalk';
import * as os from 'os';
import { parseTime } from './utils/parse-time';
import { logExecute } from './logic';
import { initLogStore } from './utils/init-log-store';

const spaceToLeaveAfterDivider = ' ';

type ChalkColor = typeof BackgroundColor | typeof ForegroundColor;

const slimState = false;

@Injectable({ scope: Scope.REQUEST })
export class CustomLogger implements LoggerService {


  constructor(@Inject(CONTEXT) private context?: any) {
    initLogStore();
  }


  private wrappedLog = (
    data: any,
    action: string,
    _options?: { stringify?: boolean, color?: ChalkColor },
  ) => {
    const options = _options ?? { stringify: false };
    const presentTime = Date.now();
    const parsedDate = chalk.grey("[ " + parseTime(presentTime) + " ]" + spaceToLeaveAfterDivider);
    const traceId = this?.context?.req?.trace?.reqId;
    const formattedAction = `${spaceToLeaveAfterDivider}${action}${spaceToLeaveAfterDivider}`;
    const formattedData = options.stringify && typeof data === 'object' ? JSON.stringify(data) : data;
    console.log(
      `${parsedDate}`,
      chalk[options.color ?? "whiteBright"](formattedAction),
      !slimState ? chalk.gray(formattedData) : `${chalk.black(formattedData)}`,
      !slimState ? chalk.gray(traceId ? " " + traceId : "") : chalk.black(traceId ? " " + traceId : ""),
      os.EOL,
    );
    logExecute({
      date: presentTime,
      data,
      action,
      traceId,
    });
  };

  log(message: string, tag = 'simple') {
    this.wrappedLog(message, tag);
  }

  sLog(message: Record<string, any>, tag = 'simple', color?: ChalkColor) {
    this.wrappedLog(message, tag, { stringify: true, color });
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
