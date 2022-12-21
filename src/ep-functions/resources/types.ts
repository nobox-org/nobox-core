import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";

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
export interface FunctionsMetaData {
    name: FunctionName;
    payload?: Payload;
    resources?: Resources;
};

export interface ClientHeaderContract {
    "function-resources": {
        compulsorySpaceStructures: CreateRecordSpaceInput[],
    },
}
