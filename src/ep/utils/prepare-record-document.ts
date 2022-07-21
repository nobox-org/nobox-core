import { RecordStructureType } from "@/record-spaces/dto/record-structure-type.enum";
import { RecordField } from "@/schemas";
import * as _ from "lodash";
import { throwBadRequest } from "@/utils/exceptions";

export const prepareRecordDocument = (recordSpaceId: string, body: Record<string, string>, fieldsDetailsFromDb: RecordField[], logger: any) => {
    const preparedData = {
        recordSpace: recordSpaceId,
        fieldsContent: []
    }

    const bodyStore = { ...body };
    const allowedFields = [];
    const wronglyOmittedFields = [];
    const errors = [];

    for (let index = 0; index < fieldsDetailsFromDb.length; index++) {
        const { slug, required, type, _id } = fieldsDetailsFromDb[index];
        delete bodyStore[slug];
        allowedFields.push(slug);

        const fieldExistInBody = Boolean(body[slug]);

        const fieldIsWronglyOmitted = !fieldExistInBody && required;

        if (fieldIsWronglyOmitted) {
            wronglyOmittedFields.push(slug);
            continue;
        }

        if (wronglyOmittedFields.length) {
            continue;
        }

        const fieldCanBeOmitted = !fieldExistInBody && !required;

        if (fieldCanBeOmitted) {
            continue;
        }

        const value = body[slug];
        const validationError = validateValues(value, type, slug);

        if (validationError) {
            errors.push(validationError);
        }

        if (!errors.length) { preparedData.fieldsContent.push(createDocumentByField(type, value, _id)) }

    }

    const badFields = Object.keys(bodyStore);

    if (wronglyOmittedFields.length) {
        errors.push(`the following compulsory body fields: '${String(wronglyOmittedFields)}' should be set`);
    }

    if (badFields.length) {
        errors.push(`the following body fields: '${String(badFields)}' does not exist, hence , not allowed`);
    }

    if (errors.length) {
        throwBadRequest(errors);
    }

    return preparedData;
}


const validateValues = (value: string, type: string, bodyKey: string) => {


    if (type === RecordStructureType.NUMBER && typeof value !== 'number') {
        return `Value for Body field: '${bodyKey}' should be a valid number`;
    }

    if (type === RecordStructureType.TEXT && typeof value !== 'string') {
        return `Value for Body field: '${bodyKey}' should be a valid string`;
    }

}


const createDocumentByField = (type: RecordStructureType, value: string | number, fieldId) => {
    const valueType = {
        [RecordStructureType.TEXT]: "textContent",
        [RecordStructureType.NUMBER]: "numberContent",
    }[type];
    return {
        [valueType]: value,
        field: fieldId,
    }
}
