import { RecordStructureType } from "@/types";
import { HTTP_METHODS } from "./dto/https-methods.enum";
import { MRecordField } from "@/schemas";
import { AuthOptionsScope } from "./dto/auth-options-scope";

export class RecordStructure {
    name: string;

    description: string;

    comment: string;

    defaultValue?: string;

    slug: string;

    type: RecordStructureType;

    required: boolean;

    unique: boolean;

    hashed: boolean;
}


export class Endpoint {
    path: string

    method: HTTP_METHODS

    params?: RecordStructure[]

    body?: RecordStructure[]

    example: string
}



export class GenerateEndpointInput {
    id: string;

    name: string;

    slug: string;

    projectId: string;

    description?: string;

    fields: MRecordField[];

    fieldIds: string[];

    user: string;

    admins: string[];

    developerMode: boolean;

    recordStructure?: RecordStructure[];

    endpoints?: Endpoint[];
}

export class RecordSpaceAuthOptions {
    active: boolean;

    space: string;

    token: string;

    scope: AuthOptionsScope[];
}