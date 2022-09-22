import { RecordStructureType } from "@/record-spaces/dto/record-structure-type.enum";
import { RecordField, Record as Record_ } from "@/schemas";
import { throwBadRequest } from "@/utils/exceptions";
import mongoose, { FilterQuery } from "mongoose";
import { getQueryFieldDetails } from "./get-query-field-details";

export const prepareRecordQuery = (recordSpaceSlug: string, recordSpaceId: string, query: Record<string, string>, fieldsDetailsFromDb: RecordField[], logger?: any, acrossRecords = false) => {
    logger.sLog({ recordSpaceSlug, recordSpaceId, query, fieldsDetailsFromDb }, "prepareRecordQuery");
    const { queryKeys, preparedQuery } = initPreparedQuery(recordSpaceId, query, acrossRecords);

    for (let index = 0; index < queryKeys.length; index++) {
        const queryKey = queryKeys[index];
        const fieldDetails = getQueryFieldDetails(queryKey.toLowerCase(), fieldsDetailsFromDb);
        if (!fieldDetails) {
            throwBadRequest(`Query field: ${queryKey} does not exist for ${recordSpaceSlug}`);
        }

        switch (acrossRecords) {
            case true:
                preparedQuery.$or.push(createQueryByField(fieldDetails, queryKey, query));
                break;
            case false:
                preparedQuery.$and.push(createQueryByField(fieldDetails, queryKey, query));
                break;
        }
    }
    return preparedQuery;
}


const createQueryByField = (fieldDetails: RecordField, queryKey: string, query: Record<string, string>) => {
    const { _id, type } = fieldDetails;
    const valueType = {
        [RecordStructureType.TEXT]: "textContent",
        [RecordStructureType.NUMBER]: "numberContent",
    }[type];
    const value = valueType === RecordStructureType.NUMBER ? parseInt(query[queryKey], 10) : query[queryKey];
    return {
        fieldsContent: { $elemMatch: { field: _id, [valueType]: value } }
    }
}


const initPreparedQuery = (recordSpaceId: string, query: Record<string, string>, acrossRecords) => {
    const preparedQuery: FilterQuery<Record_> = {
        recordSpace: recordSpaceId,
    }

    if (query.id) {
        if (!mongoose.Types.ObjectId.isValid(query.id)) {
            throwBadRequest(`Query field Id: ${query.id} is not a valid ObjectId`);
        }
        preparedQuery._id = query.id;
        delete query.id;
    }

    const queryKeys = Object.keys(query);
    if (queryKeys.length) {
        switch (acrossRecords) {
            case true:
                preparedQuery.$or = [];
                break;
            case false:
                preparedQuery.$and = [];
                break;

        }
    }

    return { queryKeys, preparedQuery }
}
