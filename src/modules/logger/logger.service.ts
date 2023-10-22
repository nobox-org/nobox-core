
import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';

import * as chalk from 'chalk';
import { type ForegroundColor, type BackgroundColor } from 'chalk';
import * as os from 'os';
import { parseTime } from './utils/parse-time';
import { Context } from '@/types';
import { GitData, getGitRemoteUrl } from '@/utils/gen';

const spaceToLeaveAfterDivider = ' ';

type ChalkColor = typeof BackgroundColor | typeof ForegroundColor;

const slimState = false;

interface LogDataOptions {
  stringify?: boolean;
  color?: ChalkColor;
  errorObject?: Error;
}

interface LogData {
  data: any;
  action: string;
  _options?: LogDataOptions;
}

@Injectable({ scope: Scope.REQUEST })
export class CustomLogger implements LoggerService {

  gitData: GitData;

  constructor(
    @Inject("REQUEST") private context?: Context,
  ) {
    //this.gitData = computeGitData();
  }

  private async LogOp(args: LogData) {
    const t1 = performance.now();

    const { _options, data, action } = args;
    const options = _options ?? { stringify: false };

    const presentTime = Date.now();
    const parsedDate = chalk.grey("[ " + parseTime(presentTime) + " ]" + spaceToLeaveAfterDivider);
    const traceId = this?.context?.req?.trace?.reqId;
    const formattedAction = `${spaceToLeaveAfterDivider}${action}${spaceToLeaveAfterDivider}`;
    const formattedData = options.stringify && typeof data === 'object' ? JSON.stringify(data) : data;

    // let fullFilePath: string;
    // if (options.errorObject) {
    //   ({ fullFilePath } = this.getLine(options.errorObject));
    // }

    console.log(
      `${parsedDate}`,
      chalk[options.color ?? "whiteBright"](formattedAction),
      !slimState ? chalk.gray(formattedData) : `${chalk.black(formattedData)}`,
      !slimState ? chalk.gray(traceId ? " " + traceId : "") : chalk.black(traceId ? " " + traceId : ""),
      // fullFilePath ? chalk.grey(fullFilePath) : "",
      os.EOL,
    );

    const t2 = performance.now();

    if (this?.context?.req?.trace) {
      this.context.req.trace.logTimes.push({
        sourceTag: args.action,
        time: String(t2 - t1)
      })
    }
  };

  private wrappedLog = (
    args: LogData
  ) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.LogOp(args)
        resolve(true)
      }, 500);
    });
  }

  private getLine(CustomErr: Error) {
    try {
      const callerLine = (CustomErr).stack.split("\n")[2];
      const bracketRegexPattern = /\(((.*?):(\d+):(\d+))/;
      const nonBracketRegexPattern = /at\s((.*?):(\d+):(\d+))/;
      const fullFilePath = callerLine.match(bracketRegexPattern)?.[1] || callerLine.match(nonBracketRegexPattern)?.[1];
      return {
        fullFilePath: process.env.NODE_ENV === "local" ? fullFilePath : getGitRemoteUrl(fullFilePath, this.gitData)
      };
    } catch (error) {
      return {};
    }
  }


  sLog(message: Record<string, any>, tag = 'simple', color?: ChalkColor) {
    this.wrappedLog({ data: message, action: tag, _options: { stringify: true, color, errorObject: new Error } });
  }

  error(message: string, trace = '', tag = 'error') {
    this.wrappedLog({
      data: { trace },
      action: tag,
      _options: { stringify: true }
    });
  }

  warn(message: string, tag = 'warning') {
    this.wrappedLog({
      data: message,
      action: tag
    });
  }

  debug(message: any, tag = 'debug', color?: ChalkColor) {
    this.wrappedLog({
      data: message,
      action: tag,
      _options: { color, errorObject: new Error }
    });
  }

  verbose(message: string, tag = 'verbose', extraTag?: string) {
    this.wrappedLog({
      data: message,
      action: tag
    });
  }


  log(message: string, tag = 'simple') {
    this.wrappedLog({
      data: message,
      action: tag
    });
  }


}

export const CustomLoggerInstance = new CustomLogger();
