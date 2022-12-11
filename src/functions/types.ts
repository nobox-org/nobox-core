import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";

export type FunctionNames = "login";

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
    body: Record<string, PayloadValue>;
}
export interface FunctionsMetaData {
    name: FunctionNames;
    payload: Payload;
    resources: Resources;
};
