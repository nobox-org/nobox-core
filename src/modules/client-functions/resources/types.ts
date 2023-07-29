import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { RecordFieldStructure } from '@/modules/record-spaces/types';

export type FunctionName = 'login' | 'send-otp';

export interface Resources {
   recordSpaces: Record<string, RecordSpaces>;
}

export interface RecordSpaces {
   getCreationInput: (
      args: Pick<CreateRecordSpaceInput, 'projectSlug'>,
   ) => CreateRecordSpaceInput;
}

export interface PayloadValue {
   type: 'string';
   required: boolean;
}

export interface Payload {
   body?: Record<string, PayloadValue>;
}

export type MustExistFieldsForFunctions = Pick<
   RecordFieldStructure,
   'slug' | 'type'
>[];
export interface FunctionMetaData {
   name: FunctionName;
   payload?: Payload;
   resources?: Resources;
   mustExistFields?: MustExistFieldsForFunctions;
}

export interface ClientHeaderContract {
   'function-resources': {
      mustExistSpaceStructures: CreateRecordSpaceInput[];
   };
}
