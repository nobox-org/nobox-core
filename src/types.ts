import { Request } from 'express';
import { RecordField, RecordSpace, Record as RecordDbModel, Project as ProjectDbModel, User } from './schemas';
import { CustomLoggerInstance as Logger } from '@/logger/logger.service';
import { LeanDocument } from 'mongoose';

export type CObject = Record<string, any>;


export enum CommandType {
  FIND = "find",
  UPDATE = "update",
  INSERT = "insert",
  DELETE = "delete",
}


export type NonEmptyArray<T> = [T, ...T[]];

export interface ServerMessage {
  hi: string;
  knowMore: string;
}

export interface AuthLoginResponse {
  match: boolean;
  details: any;
}

export interface RequestWithEmail extends Request {
  req: {
    user: User;
    trace: TraceInit;
  }
}


export enum UsedHttpVerbs {
  "GET" = "GET",
  "POST" = "POST",
  "DELETE" = "DELETE"
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

export enum Gender {
  male = 'male',
  female = 'female',
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
  Local = "local",
  Dev = "dev",
  Staging = "staging",
  Production = "prod"
}

export enum NumBool {
  zero = "0",
  one = "1"
}

export type RecordSpaceWithRecordFields = Omit<RecordSpace, "recordFields"> & { recordFields: RecordField[] };
export interface PreOperationPayload {
  recordSpace: RecordSpaceWithRecordFields
}

export type MongoDocWithTimeStamps<T> = T & { createdAt: Date, updatedAt: Date };

export interface TraceObject extends TraceInit {
  project?: ProjectDbModel;
  recordSpace?: RecordSpaceWithRecordFields;
  clientCall?: ClientCall;
  existingRecord: RecordDbModel;
  optionallyHashedOnTransit?: boolean;
  functionResources: Record<string, any>
}

export interface ClientCall {
  options: ClientCallOptions;
}

export type ParamRelationship = "Or" | "And";
export interface ClientCallOptions {
  paramRelationship: ParamRelationship
};

export interface TraceInit {
  reqId: string;
  method?: UsedHttpVerbs;
  isQuery?: boolean;
  connectionSource: "Graphql" | "REST",
  records: Record<string, MongoDocWithTimeStamps<LeanDocument<RecordDbModel>>>;
}

export interface Context {
  req: {
    trace: TraceObject;
    req: RequestWithEmail;
    [x: string | number | symbol]: any;
  }
}

export interface EpCompositeArgs<T extends object> {
  params: T;
  body: Record<string, any>;
}

export type RecordDbContentType = "textContent" | "numberContent";

export type LoggerType = typeof Logger;
