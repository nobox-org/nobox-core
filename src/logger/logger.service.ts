import { consoleColors } from '@/utils';
import { Inject, Injectable, LoggerService, Scope } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import * as chalk from 'chalk';
import * as os from 'os';
import logger, { initLogStore } from './logic';


const moduleName = 'ProjectLog';

const initDate = Date.now();
const tagDivider = '::';
const dateDivider = ':::';
const spaceToLeaveAfterDivider = ' ';

function parseTime(unixTimestamp) {
  const date = new Date(unixTimestamp);
  const hours = date.getHours();
  const minutes = '0' + date.getMinutes();
  const seconds = '0' + date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const formattedTime =
    hours +
    ':' +
    minutes.substr(-2) +
    ':' +
    seconds.substr(-2) +
    ' ' +
    milliseconds;
  return formattedTime;
}

const slimState = false;

@Injectable({ scope: Scope.REQUEST })
export class CustomLogger implements LoggerService {
  constructor(@Inject(CONTEXT) private context?: any) {
    //  initLogStore();
  }

  private loggerTag = '';

  private wrappedLog = (
    message: any,
    tag: string,
    options = { stringify: false },
  ) => {
    const dateNow = chalk.grey("[ " + parseTime(Date.now()) + " ]" + spaceToLeaveAfterDivider);
    const traceId = this?.context?.req.trace?.reqId;
    const action = `${spaceToLeaveAfterDivider}${tag}${spaceToLeaveAfterDivider}`;
    const data = options.stringify && typeof message === 'object' ? JSON.stringify(message) : message;
    console.log(
      `${dateNow}`,
      chalk.whiteBright(action),
      !slimState ? chalk.gray(data) : `${chalk.black(data)}`,
      !slimState ? chalk.gray(traceId ? " " + traceId : "") : chalk.black(traceId ? " " + traceId : ""),
      os.EOL,
    )
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
