import { RecordField, Record } from "@/schemas";
import { MongoDocWithTimeStamps } from "@/types";

export const formatRecordForEpResponse = (record: MongoDocWithTimeStamps<Record>) => {
    if (!record) {
        return null;
    }
    const { _id, updatedAt, createdAt, fieldsContent } = record;
    const ret = { id: _id, updatedAt, createdAt };
    for (let index = 0; index < fieldsContent.length; index++) {
        const { field, textContent, numberContent } = fieldsContent[index];
        const content = textContent || numberContent;
        const fieldKey = (field as RecordField).slug;
        ret[fieldKey] = content;
    }

    return ret;
}