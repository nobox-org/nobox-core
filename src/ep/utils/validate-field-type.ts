import { CreateRecordSpaceInput } from "@/record-spaces/dto/create-record-space.input";
import { RecordStructureType } from "@/record-spaces/dto/record-structure-type.enum";
import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import { throwBadRequest } from "@/utils/exceptions";

export const validateFieldType = (args: {
    recordStructure: CreateRecordSpaceInput["recordStructure"];
    fields: Record<string, any>;
    logger: typeof Logger;
}) => {
    const { logger, fields, recordStructure } = args
    logger.sLog({ fields, recordStructure }, "validateFieldType");

    const matchedFields = [];

    const typeErrors = [];

    for (let index = 0; index < recordStructure.length; index++) {
        const { slug, type } = recordStructure[index];
        const value = fields[slug];

        if (value) {
            matchedFields.push(value);
            if (type === RecordStructureType.NUMBER && isNaN(value)) {
                typeErrors.push(`${slug} should be a number value`);
            }
        };
    }

    return { typeErrors, matchedFields };
}