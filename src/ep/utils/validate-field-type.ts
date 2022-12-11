import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";
import { RecordStructureType } from "@/record-spaces/dto/record-structure-type.enum";
import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import { throwBadRequest } from "@/utils/exceptions";

export const validateFieldType = (args: { recordStructure: CreateRecordSpaceInput["recordStructure"], fields: Record<string, any>[] | Record<string, any>, logger: typeof Logger }) => {
    const { logger, fields, recordStructure } = args
    logger.sLog({ fields }, "EpService::validateFieldType")
    const arrField = Array.isArray(fields) ? fields : new Array(fields);
    for (let i = 0; i < arrField.length; i++) {
        validate(recordStructure, arrField[i]);
    }
}

function validate(recordStructure: CreateRecordSpaceInput["recordStructure"], fields: Record<string, any>[]) {
    const error = [];
    for (let index = 0; index < recordStructure.length; index++) {
        const { slug, type } = recordStructure[index];
        const value = fields[slug];
        if (value && type === RecordStructureType.NUMBER && isNaN(value)) {
            error.push(`${slug} should be a number value`);
        }
    }

    if (error.length) {
        throwBadRequest(error);
    }
    return error;
}