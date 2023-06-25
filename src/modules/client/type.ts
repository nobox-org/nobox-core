import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { MRecordSpace, MProject } from '@/schemas';
import { CObject } from '@/types';
import { RecordStructure } from '../record-spaces/types';

export interface PreOperationResources {
   autoCreateProject: boolean;
   autoCreateRecordSpace: boolean;
   authOptions: CreateRecordSpaceInput['authOptions'];
   recordSpace: MRecordSpace;
   options: any;
   recordStructure: RecordStructure[];
   projectSlug: string;
   fieldsToConsider: CObject;
   user: any;
   project: MProject;
   initialData: Record<string, any>[];
   mutate: boolean;
   clearAllRecordSpaces: boolean;
   clearThisRecordSpace: boolean;
}
