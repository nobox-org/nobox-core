import { CompulsoryEnvVars, ClientSourceFunctionType } from '@/types';
import { exec, execSync } from 'child_process';
import { CustomLoggerInstance as Logger } from '../modules/logger/logger.service';
import { akinFriendlyDate } from './date-formats';

interface CommitData {
   message: string;
   time: string;
}

export function getUnixTime() {
   return String((Date.now() / 1000) | 0);
}

export function isSameWhenStripped(str1: string, str2: string) {
   const formatString = (str: string) => str.replace(/\W/g, '').toLowerCase();
   return formatString(str1) === formatString(str2);
}

export function dummyResponseBySourceFunction(
   sourceFunctionType: ClientSourceFunctionType,
) {
   switch (sourceFunctionType) {
      case 'addRecord' ||
         'updateRecord' ||
         'updateRecordById' ||
         'deleteRecord' ||
         'deleteRecordById' ||
         'getRecord':
         return {};
      case 'getRecords' || 'deleteRecords':
         return [];
      default:
         return {};
   }
}

export function getGitRemoteUrl(fullFilePath: string): string | null {
   try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
         encoding: 'utf-8',
      }).trim();
      const branchName = execSync('git rev-parse --abbrev-ref HEAD', {
         encoding: 'utf-8',
      }).trim();
      const filePath = execSync('pwd', { encoding: 'utf-8' }).trim();

      const remoteUrlMatch = remoteUrl.match(
         /https:\/\/github.com\/([^/]+)\/([^/.]+)\.git/,
      );
      if (!remoteUrlMatch) {
         Logger.sLog({ remoteUrl }, 'Remote URL is not a GitHub repository.');
         return null;
      }

      const [username, repoName] = remoteUrlMatch.slice(1, 3);

      const fullFilePathMatch = fullFilePath.split(':');
      const relativeFilePath = fullFilePathMatch[0]
         .replace(filePath, '')
         .replace(/^\//, '');

      const lineNumber = fullFilePathMatch[1]
         ? `#L${fullFilePathMatch[1]}`
         : '';
      const githubURL = `https://github.com/${username}/${repoName}/blob/${branchName}/${relativeFilePath}${lineNumber}`;

      return githubURL;
   } catch (error) {
      Logger.error('Error retrieving Git information:', error);
      return null;
   }
}

export function getLastCommitData(): Promise<CommitData> {
   return new Promise<CommitData>((resolve, reject) => {
      // Execute Git command to get the last commit data
      exec('git log -1 --pretty=format:"%s|%ad"', (error, stdout, stderr) => {
         if (error) {
            console.error(`Error executing Git command: ${error}`);
            reject(error);
            return;
         }

         // Split the output by the separator '|'
         const [message, time] = stdout.trim().split('|');

         // Resolve the promise with the commit data object
         resolve({ message, time });
      });
   });
}

export function timeAgo(dateString: string): string {
   const date = new Date(dateString);
   const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

   const intervals = {
      year: Math.floor(seconds / 31536000),
      month: Math.floor(seconds / 2592000),
      week: Math.floor(seconds / 604800),
      day: Math.floor(seconds / 86400),
      hour: Math.floor(seconds / 3600),
      minute: Math.floor(seconds / 60),
   };

   let timeAgo = '';

   for (const interval in intervals) {
      if (intervals[interval] > 0) {
         timeAgo = `${intervals[interval]} ${interval}${
            intervals[interval] === 1 ? '' : 's'
         } ago`;
         break;
      }
   }

   return timeAgo || 'Just now';
}

export async function serverInit(port: number, fullURL: string): Promise<void> {
   Logger.sLog(
      { port, time: akinFriendlyDate.format(new Date()) },
      'serverInit::starts',
   );
   Logger.log(`serverUrl: ${fullURL}`, 'serverLinks');
   Logger.log(`serverDocs: ${fullURL}/docs`, 'serverLinks');
}

export async function logCodeStateInfo(): Promise<void> {
   const lastCommitData: CommitData = await getLastCommitData();
   const timeElapsed: string = timeAgo(lastCommitData.time);

   lastCommitData.time = akinFriendlyDate.format(new Date(lastCommitData.time));

   Logger.sLog(lastCommitData, `lastCommitData::${timeElapsed}`);
}

export const assertCompulsoryEnvProvision = (
   compulsoryEnvVars: string[] = Object.keys(CompulsoryEnvVars),
) => {
   Logger.sLog(compulsoryEnvVars, 'assertCompulsoryEnvProvision');

   for (let index = 0; index < compulsoryEnvVars.length; index++) {
      const element = compulsoryEnvVars[index];
      if (!process.env[element]) {
         throw new Error(`process.env.${element} must be provided`);
      }
   }
};
