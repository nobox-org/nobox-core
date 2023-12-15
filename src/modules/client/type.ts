import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { MRecordSpace, MProject } from "nobox-shared-lib";
import { CObject } from '@/types';
import { RecordFieldStructure } from '../record-spaces/types';

export interface PreOperationResources {
   autoCreateProject: boolean;
   autoCreateRecordSpace: boolean;
   authOptions: CreateRecordSpaceInput['authOptions'];
   recordSpace: MRecordSpace;
   options: any;
   recordFieldStructure: RecordFieldStructure[];
   projectSlug: string;
   fieldsToConsider: CObject;
   user: any;
   project: MProject;
   initialData: Record<string, any>[];
   mutate: boolean;
   clearAllRecordSpaces: boolean;
   clearThisRecordSpace: boolean;
}

export enum ClientHeaderKeys {
   AutoCreateProject = 'auto-create-project',
   AutoCreateRecordSpace = 'auto-create-record-space',
   Structure = 'structure',
   Options = 'options',
   Mutate = 'mutate',
   ClearAllRecords = 'clear-all-spaces',
   InferStructure = 'infer-structure',
   XRequestedWith = 'X-Requested-With',
   XHTTPMethodOverride = 'X-HTTP-Method-Override',
   ContentType = 'Content-Type',
   Accept = 'Accept',
   Observe = 'Observe',
   Authorization = 'Authorization',
   FunctionResources = 'function-resources',
   Token = 'token',
   UsePreStoredStructure = 'use-pre-stored-structure',
};

export type ClientHeaders = Partial<Record<ClientHeaderKeys, string>>;