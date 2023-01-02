import { RecordField, Record } from "@/schemas";
import { MongoDocWithTimeStamps } from "@/types";
import { bcryptAbs } from "@/utils";
import { CustomLogger as Logger } from '@/logger/logger.service';
import { LeanDocument } from "mongoose";
import { collection, recordDump } from "@/utils/direct-mongodb-connection";
import { throwBadRequest } from "@/utils/exceptions";

/**
 * This formats for response and also compare 
 * ...hashed fields that were previously exempted
 * @param args 
 * @param logger 
 * @returns 
 */

export const postOperateRecord = async (args: {
    record: MongoDocWithTimeStamps<LeanDocument<Record>>,
    allHashedFieldsInQuery?: { value: string | number, slug: string }[]
    recordSpaceSlug: string;
    projectSlug: string;
    userId: string;
    options?: { noThrow: boolean }
}, logger: Logger) => {
    console.time("postOperateRecord")
    logger.sLog({ record: args.record, allHashedFields: Boolean(args.allHashedFieldsInQuery) }, "postOperateRecord");

    const { record, allHashedFieldsInQuery, recordSpaceSlug, projectSlug, userId, options = { noThrow: false } } = args;

    const hashedFields = {};

    const { _id, updatedAt, createdAt, fieldsContent } = record;
    const formattedRecord = { id: _id, updatedAt, createdAt } as any;
    for (let index = 0; index < fieldsContent.length; index++) {
        const { field, textContent, numberContent } = fieldsContent[index];
        const { slug: fieldSlug, hashed: fieldIsHashed } = field as RecordField;
        const content = textContent || numberContent;
        const fieldKey = fieldSlug;
        const hashedFieldInQuery = allHashedFieldsInQuery && allHashedFieldsInQuery.find(a => a.slug === fieldKey);

        const hashedFieldIsInQuery = Boolean(hashedFieldInQuery);

        if (hashedFieldIsInQuery) {
            const same = await bcryptAbs.compare(hashedFieldInQuery.value, content);
            if (!same) {
                return null;
            }
        }

        if (!hashedFieldIsInQuery && !fieldIsHashed) {
            formattedRecord[fieldKey] = content;
        } else {
            hashedFields[fieldKey] = content;
        }

    }
    console.timeEnd("postOperateRecord");

    if (!options.noThrow && !formattedRecord) {
        logger.debug(`No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`, 'postOperateRecord')
        throwBadRequest(
            `No records found for your request`,
        );
    }

    if (formattedRecord) {
        recordDump(logger).updateOne({ id: formattedRecord.id }, {
            ...hashedFields,
            ...formattedRecord
        }, { recordSpaceSlug, projectSlug, userId });
    }

    return formattedRecord;
}