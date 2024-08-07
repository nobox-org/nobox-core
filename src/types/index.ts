import { Request } from 'express';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import {
   MProject,
   MRecordField,
   MRecordSpace,
   MRecord,
   MUser,
   PricePlan,
} from 'nobox-shared-lib';
import { BaseRecordSpaceSlugDto } from '../modules/client/dto/base-record-space-slug.dto';
import { RecordFieldStructure } from '@/modules/record-spaces/types';

export type CObject<T = any> = Record<string, T>;

export type AnyFunction = (...args: any[]) => any;

export enum CommandType {
   FIND = 'find',
   FINDONE = 'find_one',
   INSERT = 'insert',
   INSERTONE = 'insert_one',
   UPDATE = 'update',
   UPDATEONE = 'update_one',
   UPDATEONEBYID = 'update_one_by_id',
   GETTOKENOWNER = 'get_token_owner',
   SETKEYS = 'set_keys',
   GETKEYS = 'get_keys',
   DELETE = 'delete',
   SEARCH = 'search'
}

export enum CompulsoryEnvVars {
   // 'SENTRY_DSN' = 'SENTRY_DSN',
}

export type ClientSourceFunctionType =
   | 'addRecord'
   | 'addRecords'
   | 'updateRecord'
   | 'updateRecordById'
   | 'getRecord'
   | 'getRecords'
   | 'getRecordById'
   | 'deleteRecord'
   | 'getTokenOwner'
   | 'getKeyValues'
   | 'setKeyValues'
   | 'searchRecords';

export type NonEmptyArray<T> = [T, ...T[]];

export interface ServerMessage {
   hi: string;
   knowMore: string;
}

export interface HealthCheckMessage {
   status: 'healthy';
   timestamp: Date;
}

export interface AuthLoginResponse {
   match: boolean;
   details: any;
}

export interface RequestWithEmail extends Request {
   req: {
      user: MUser;
      trace: TraceInit;
   };
}

export enum UsedHttpVerbs {
   'GET' = 'GET',
   'POST' = 'POST',
   'DELETE' = 'DELETE',
}

export class BufferedFile {
   fieldname: string;
   originalname: string;
   encoding: string;
   mimetype: AppMimeType | string;
   size?: number;
   buffer: Buffer | string;
}

export type AppMimeType = 'image/png' | 'image/jpeg';

export enum SpaceType {
   private = 'private',
   public = 'public',
}

export enum UserType {
   vendor = 'vendor',
   nonvendor = 'non-vendor',
}

export interface DateOfBirth {
   year: number;
   month: number;
   day: number;
}

export enum NodeEnvironment {
   Local = 'local',
   Test = 'test',
   Dev = 'dev',
   Staging = 'staging',
   Production = 'prod',
}

export enum NumBool {
   zero = '0',
   one = '1',
}

export type RecordSpaceType = 'key-value' | 'rowed';

export type ReMappedRecordFields = Record<string, MRecordField>;

export type Modify<T, R> = Omit<T, keyof R> & R;

export type HydratedRecordSpace = Modify<
   MRecordSpace,
   {
      reMappedRecordFields: ReMappedRecordFields;
   }
>;

export type PopulatedRecordSpace = Omit<
   MRecordSpace,
   'project' | 'recordFields'
> & {
   project?: MProject;
   recordFields?: MRecordField[];
};

export interface PreOperationPayload {
   recordSpace: HydratedRecordSpace;
}

export type MongoDocWithTimeStamps<T> = T & {
   createdAt: Date;
   updatedAt: Date;
};

export interface TraceObject extends TraceInit {
   project?: MProject;
   recordSpace?: HydratedRecordSpace;
   clientCall?: ClientCall;
   existingRecord: MRecord;
   optionallyHashedOnTransit?: boolean;
   functionResources: Record<string, any>;
}

export interface ClientCall {
   options: ClientCallOptions;
}

export type ParamRelationship = 'Or' | 'And';

export enum RecordStructureType {
   TEXT = 'TEXT',
   NUMBER = 'NUMBER',
   BOOLEAN = 'BOOLEAN',
   OBJECT = 'OBJECT',
   ARRAY = 'ARRAY',
}

export interface ClientCallOptions {
   paramRelationship: ParamRelationship;
}

export interface TraceInit {
   reqId: string;
   method?: UsedHttpVerbs;
   isQuery?: boolean;
   isSearch?: boolean;
   connectionSource: 'REST';
   uniqueUrlComponent?: string;
   sourceUrl: string;
   records: Record<string, MRecord>;
   startTime?: number;
   endTime?: number;
   dbTimes?: {
      sourceTag: string;
      time: string;
   }[];
   logTimes: {
      sourceTag: string;
      time: string;
   }[];
   clientIp: string;
   userAgent: string;
   origin: string;
}

export interface Context {
   req: {
      trace: TraceObject;
      req: RequestWithEmail;
      [x: string | number | symbol]: any;
   };
}

export interface ClientCompositeArgs<T extends object> {
   params: T;
   body: Record<string, any>;
}

export type RecordDbContentType =
   | 'textContent'
   | 'numberContent'
   | 'objectContent'
   | 'booleanContent'
   | 'arrayContent';

export type LoggerType = typeof Logger;

export interface GoogleOAuthUserDetails {
   sub: string;
   name: string;
   given_name: string;
   family_name: string;
   picture: string;
   email: string;
   email_verified: boolean;
   locale: string;
}

export enum OAuthThirdPartyName {
   google = 'google',
   facebook = 'facebook',
   github = 'github',
}

export interface ThirdPartyLoginDetails {
   email: string;
   firstName: string;
   lastName: string;
   accessToken: string;
   avatar_url: string;
   thirdPartyName: OAuthThirdPartyName;
   pricePlan?: PricePlan;
}

export interface BaseCommandArgs {
   params?: BaseRecordSpaceSlugDto;
   commandType?: CommandType;
}

export interface CommandArgs extends BaseCommandArgs {
   body?: CObject;
   update?: CObject;
   query?: CObject;
   bodyArray?: CObject[];
}

export interface TriggerOTPDto {
   phoneNumber: string;
   confirmationCode: string;
}

export interface AuthConfDetails {
   clientId: string;
   clientSecret: string;
   callBackUrl: string;
}

export enum Gender {
   male = 'male',
   female = 'female',
}

export interface MustExistSpaceStructure {
   name: string;
   description: string;
   projectSlug: string;
   slug: string;
   recordFieldStructures: RecordFieldStructure[];
   clear: boolean;
   initialData: Record<string, any>[];
   functionOptions: Record<
      string,
      {
         compulsoryParams: string[];
      }
   >;
}

export interface FunctionResources {
   mustExistSpaceStructures: MustExistSpaceStructure[];
}
