import { Request } from 'express';
import { RecordField, RecordSpace } from './schemas';
import { User } from './user/graphql/model';

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
  user: User;
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
