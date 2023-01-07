import { Request } from 'express';
import { MRecordField, MRecordSpace, MRecord, MUser } from './schemas';
import { CustomLoggerInstance as Logger } from '@/logger/logger.service';
import { MProject } from './schemas/slim-schemas/projects.slim.schema';
import { ObjectId } from 'mongodb';

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
    user: MUser;
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

export type ObjectIdOrString = string | ObjectId;

export type ReMappedRecordFields = Record<string, MRecordField>;

export type Modify<T, R> = Omit<T, keyof R> & R;

export type HydratedRecordSpace = Modify<MRecordSpace, {
  reMappedRecordFields: ReMappedRecordFields;
}>;

export type PopulatedRecordSpace = Omit<MRecordSpace, "project" | "recordFields"> & {
  project?: MProject;
  recordFields?: MRecordField[];
};

export interface PreOperationPayload {
  recordSpace: HydratedRecordSpace
}

export type MongoDocWithTimeStamps<T> = T & { createdAt: Date, updatedAt: Date };

export interface TraceObject extends TraceInit {
  project?: MProject;
  recordSpace?: HydratedRecordSpace;
  clientCall?: ClientCall;
  existingRecord: MRecord;
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
  records: Record<string, MRecord>;
  startTime?: number;
  endTime?: number;
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
