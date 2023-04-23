import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";
import { RecordStructure } from "@/record-spaces/entities/record-structure.entity";
import { MRecordSpace, MProject } from "@/schemas";
import { CObject } from "@/types";

export interface PreOperationResources {
    autoCreateProject: boolean;
    autoCreateRecordSpace: boolean;
    authOptions: CreateRecordSpaceInput["authOptions"];
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
