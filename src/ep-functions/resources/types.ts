import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";
import { RecordStructure } from "@/record-spaces/entities/record-structure.entity";

export type FunctionName = "login" | "send-otp";

export interface Resources {
    recordSpaces: Record<string, RecordSpaces>;
};

export interface RecordSpaces {
    getCreationInput: (args: Pick<CreateRecordSpaceInput, "projectSlug">) => CreateRecordSpaceInput;
};

export interface PayloadValue {
    type: 'string',
    required: boolean,
}

export interface Payload {
    body?: Record<string, PayloadValue>;
}

export type MustExistFieldsForFunctions = Pick<RecordStructure, "slug" | "type">[];
export interface FunctionMetaData {
    name: FunctionName;
    payload?: Payload;
    resources?: Resources;
    mustExistFields?: MustExistFieldsForFunctions;
};

export interface ClientHeaderContract {
    "function-resources": {
        mustExistSpaceStructures: CreateRecordSpaceInput[],
    },
}
