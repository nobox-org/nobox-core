import { RecordStructureType } from "@/record-spaces/dto/record-structure-type.enum";
import { RecordField, Record as Record_ } from "@/schemas";
import { throwBadRequest } from "@/utils/exceptions";
import { FilterQuery } from "mongoose";
import { getQueryFieldDetails } from "./get-query-field-details";

export const prepareRecordQuery = (recordSpaceSlug: string,recordSpaceId: string, query: Record<string, string>, fieldsDetailsFromDb: RecordField[], logger: any) => {
    const queryKeys = Object.keys(query);
    const mongoQuery$And = [];
    for (let index = 0; index < queryKeys.length; index++) {
        const queryKey = queryKeys[index];
        const fieldDetails = getQueryFieldDetails(queryKey.toLowerCase(), fieldsDetailsFromDb);
        if (!fieldDetails) {
            throwBadRequest(`Query field: ${queryKey} does not exist for ${recordSpaceSlug}`);
        }
        const { _id, type } = fieldDetails;
        const valueType = {
            [RecordStructureType.TEXT]: "textContent",
            [RecordStructureType.NUMBER]: "numberContent",
        }[type];
        mongoQuery$And.push({ 'fieldsContent.field': _id, [`fieldsContent.${valueType}`]: query[queryKey] });
    }
    const preparedQuery: FilterQuery<Record_> = {
        recordSpace: recordSpaceId,
        $and: mongoQuery$And
    }
    return preparedQuery;
}