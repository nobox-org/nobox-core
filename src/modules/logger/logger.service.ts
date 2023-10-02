
import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';


import * as chalk from 'chalk';
import { type ForegroundColor, type BackgroundColor } from 'chalk';
import * as os from 'os';
import { parseTime } from './utils/parse-time';
import { getGitRemoteUrl } from '@/utils/gen';
import { Context } from '@/types';

const spaceToLeaveAfterDivider = ' ';

type ChalkColor = typeof BackgroundColor | typeof ForegroundColor;

const slimState = false;

@Injectable({ scope: Scope.REQUEST })
export class CustomLogger implements LoggerService {

  constructor(@Inject("REQUEST") private context?: Context) {
  }

  private LogOp = (
    data: any,
    action: string,
    _options?: { stringify?: boolean, color?: ChalkColor, errorObject?: Error },
  ) => {
    const options = _options ?? { stringify: false };

    const presentTime = Date.now();
    const parsedDate = chalk.grey("[ " + parseTime(presentTime) + " ]" + spaceToLeaveAfterDivider);
    const traceId = this?.context?.req?.trace?.reqId;
    const formattedAction = `${spaceToLeaveAfterDivider}${action}${spaceToLeaveAfterDivider}`;
    const formattedData = options.stringify && typeof data === 'object' ? JSON.stringify(data) : data;

    let fullFilePath: string;
    if (options.errorObject) {
      ({ fullFilePath } = this.getLine(options.errorObject));
    }

    console.log(
      `${parsedDate}`,
      chalk[options.color ?? "whiteBright"](formattedAction),
     !slimState ? chalk.gray(formattedData) : `${chalk.black(formattedData)}`,
      !slimState ? chalk.gray(traceId ? " " + traceId : "") : chalk.black(traceId ? " " + traceId : ""),
      fullFilePath ? chalk.grey(fullFilePath) : "",
      os.EOL,
    );
  };



  private wrappedLog = (
    data: any,
    action: string,
    _options?: { stringify?: boolean, color?: ChalkColor, errorObject?: Error },
  ) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
      this.LogOp(data, action, _options)
      resolve(true)
      }, 500);
    });
  }

  log(message: string, tag = 'simple') {
    
    this.wrappedLog(message, tag);
  }

  private getLine(CustomErr: Error) {
    try {
      const callerLine = (CustomErr).stack.split("\n")[2];
      const bracketRegexPattern = /\(((.*?):(\d+):(\d+))/;
      const nonBracketRegexPattern = /at\s((.*?):(\d+):(\d+))/;
      const fullFilePath = callerLine.match(bracketRegexPattern)?.[1] || callerLine.match(nonBracketRegexPattern)?.[1];
      return {
        fullFilePath: process.env.NODE_ENV === "local" ? fullFilePath : getGitRemoteUrl(fullFilePath)
      };
    } catch (error) {
      return {};
    }
  }

  sLog(message: Record<string, any>, tag = 'simple', color?: ChalkColor) {
    const t1 = performance.now();
    this.wrappedLog(message, tag, { stringify: true, color, errorObject: new Error });
    const t2 = performance.now();
    if (this?.context?.req?.trace) {
      this.context.req.trace.logTimes.push({
        sourceTag: tag,
        time: String(t2-t1)
      })
   }
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
