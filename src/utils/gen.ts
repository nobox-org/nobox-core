import { CompulsoryEnvVars, ClientSourceFunctionType, RecordStructureType, CommandType } from '@/types';
import { exec, execSync } from 'child_process';
import { CustomLoggerInstance as Logger } from '../modules/logger/logger.service';
import { akinFriendlyDate } from './date-formats';
import { BaseRecordSpaceSlugDto } from '@/modules/client/dto/base-record-space-slug.dto';
import { convertBooleanStringsToBooleans } from './convertTruthyStringsToBooleans';
import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { throwBadRequest } from './exceptions';
import { ClientHeaderKeys, ClientHeaders } from '@/modules/client/type';
import { IncomingHttpHeaders } from 'http';
import { MRecordSpace } from 'nobox-shared-lib';
import { customAlphabet } from 'nanoid'


interface CommitData {
   message: string;
   time: string;
}

export interface GitData {
   remoteUrl: string;
   branchName: string;
   filePath: string;
   remoteUrlMatch: RegExpMatchArray;
   username: string;
   repoName: string;
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

export function computeGitData() {

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

   const [username, repoName] = remoteUrlMatch.slice(1, 3);

   return { remoteUrl, branchName, filePath, remoteUrlMatch, username, repoName };
}

export function getGitRemoteUrl(fullFilePath: string, gitData: GitData): string | null {
   try {

      const { branchName, filePath, username, repoName } = gitData;

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
         timeAgo = `${intervals[interval]} ${interval}${intervals[interval] === 1 ? '' : 's'
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

export const getFieldStructure = (body: any) => {
   const recordFieldStructures = [];
   const objectEntries = Object.entries(body);
   const getTypeFromValue = (value: boolean | number | string | any[]) => typeof value === "boolean" ? RecordStructureType.BOOLEAN
      : typeof value === "number" ? RecordStructureType.NUMBER
         : Array.isArray(value) ? RecordStructureType.ARRAY
            : RecordStructureType.TEXT;

   const camelToTrain = (str: string) => str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
   for (let i = 0; i < objectEntries.length; i++) {
      const [name, value] = objectEntries[i];
      const recordFieldStructure = {
         required: false,
         unique: false,
         description: "",
         comment: "",
         hashed: false,
         name,
         slug: camelToTrain(name),
         type: getTypeFromValue(value as any)
      };
      recordFieldStructures.push(recordFieldStructure);
   }


   return recordFieldStructures;
}

export const getStructureFromObject = (args: {
   body: any;
   recordSpaceSlug: string;
   projectSlug: string;
}) => {
   const { body, recordSpaceSlug, projectSlug } = args;
   return {
      name: recordSpaceSlug,
      description: "",
      slug: recordSpaceSlug,
      projectSlug,
      webhooks: null,
      recordFieldStructures: getFieldStructure(body)
   };
}

export const computeStructure = (args: {
   body: any;
   structure: any,
   functionArgs: {
      commandType?: CommandType;
      params: BaseRecordSpaceSlugDto;
   }
   inferStructure: boolean;
   usePreStoredStructure: boolean;
}) => {
   const { body, structure, functionArgs, inferStructure, usePreStoredStructure } = args;

   const { params: { recordSpaceSlug, projectSlug } } = functionArgs;

   if (usePreStoredStructure && inferStructure) {
      throwBadRequest("You can't set infer-structure and use-pre-stored-structure at the same time");
   };

   if (usePreStoredStructure) {
      return null;
   }

   if (inferStructure) {

      if (structure) {
         throwBadRequest("Structure should not be set when infer-structure is true, please unset the structure field in the request Header");
      }

      if (!body || Object.keys(body).length === 0) {
         throwBadRequest("Body should be correctly set so data can be inferred")
      }

      return getStructureFromObject({
         body,
         recordSpaceSlug,
         projectSlug
      });
   }

   if (!structure) {
      throwBadRequest("Please set structure in Request Header");
   }

   return args.structure;
}

export const updateClientHeadersWithDefaults = (headers: ClientHeaders): ClientHeaders => {
   return {
      'auto-create-project': headers?.['auto-create-project'] ?? "true",
      'auto-create-record-space': headers?.['auto-create-record-space'] ?? "true",
      'structure': headers?.['structure'] ?? null,
      'options': headers?.['options'] ?? JSON.stringify({ "paramRelationship": "And" }),
      'mutate': headers?.['mutate'] ?? "true",
      'clear-all-spaces': headers?.['clear-all-spaces'] ?? "false",
      'infer-structure': headers?.['infer-structure'] ?? "false",
      'use-pre-stored-structure': headers?.['use-pre-stored-structure'] ?? "false",
   }
}

export const computeClientHeaders = (args: {
   clientHeaders: ClientHeaders;
   body: any;
   functionArgs: {
      commandType?: CommandType;
      params: BaseRecordSpaceSlugDto;
   };
   recordSpaceDetails: MRecordSpace;
}) => {
   const { clientHeaders, functionArgs, body, recordSpaceDetails } = args;

   const {
      'auto-create-project': autoCreateProject,
      'auto-create-record-space': autoCreateRecordSpace,
      structure,
      options,
      mutate,
      'clear-all-spaces': clearAllRecordSpaces,
      'infer-structure': inferStructure,
      'use-pre-stored-structure': usePreStoredStructure
   } = convertBooleanStringsToBooleans<ClientHeaders, Record<ClientHeaderKeys, any>>(updateClientHeadersWithDefaults(clientHeaders));


   const incomingRecordSpaceStructure = computeStructure({
      functionArgs,
      body,
      structure,
      inferStructure,
      usePreStoredStructure,
   }) as CreateRecordSpaceInput;


   if (!recordSpaceDetails && usePreStoredStructure) {
      throwBadRequest("Please set the structure of this record space before using it with a 'use-pre-stored-structure' header");
   }

   if (incomingRecordSpaceStructure) {

      if (incomingRecordSpaceStructure.projectSlug !== functionArgs.params.projectSlug) {
         throwBadRequest(
            `ProjectSlug: ${incomingRecordSpaceStructure.projectSlug} in provided header structure is not compatible with ProjectSlug in url params ${functionArgs.params.projectSlug}`
         )
      }

      if (incomingRecordSpaceStructure.slug !== functionArgs.params.recordSpaceSlug) {
         throwBadRequest(
            `ProjectSlug: ${incomingRecordSpaceStructure.slug} in provided header structure is not compatible with ProjectSlug in url params ${functionArgs.params.recordSpaceSlug}`
         )
      }

   }

   const structureRelatedResources = usePreStoredStructure ? computeStructureRelatedResourcesFromRecordSpace() : computeStructureRelatedResources(incomingRecordSpaceStructure);

   return {
      ...structureRelatedResources,
      autoCreateProject,
      autoCreateRecordSpace,
      options: options ? JSON.parse(options) : null,
      mutate,
      clearAllRecordSpaces,
      projectSlug: functionArgs.params.projectSlug,
      recordSpaceSlug: functionArgs.params.projectSlug,
      usePreStoredStructure,
   }
}

export const computeStructureRelatedResources = (incomingRecordSpaceStructure: any) => {
   const {
      authOptions = null,
      ...incomingRecordSpaceStrutureWithoutAuthOptions
   } = incomingRecordSpaceStructure as CreateRecordSpaceInput;

   const {
      recordFieldStructures,
      clear,
      initialData = null,
   } = incomingRecordSpaceStrutureWithoutAuthOptions;

   const authEnabled = Boolean(authOptions) && authOptions.active !== false;

   return {
      clearThisRecordSpace: Boolean(clear),
      incomingRecordSpaceStructure: incomingRecordSpaceStrutureWithoutAuthOptions,
      authOptions,
      recordFieldStructures,
      initialData,
      authEnabled,
   }
}


export const computeStructureRelatedResourcesFromRecordSpace = () => {
   return {
      clearThisRecordSpace: false,
      incomingRecordSpaceStructure: [],
      authOptions: null,
      recordFieldStructures: [],
      initialData: null,
      authEnabled: false
   }
}

export const parseStringifiedHeaderObject = (headerObject: IncomingHttpHeaders, headerKey: string) => {
   try {
      const headerValue = headerObject[headerKey]
      return headerValue
         ? JSON.parse(headerValue as string)
         : undefined;
   } catch (error) {
      Logger.sLog({ error, headerKey }, 'parseHeaderResource');
      throwBadRequest(`header: ${headerKey} is badly written, please check the object again and stringify properly`);
   }
};

export const generateApiKey = () => {
   const nanoid = customAlphabet('1234567890abcdfghi-_jlmnoprsgdyjbammatuvz', 40);
   return nanoid();
}