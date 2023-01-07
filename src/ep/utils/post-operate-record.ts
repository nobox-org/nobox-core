import { CustomLogger as Logger } from '@/logger/logger.service';
import { throwBadRequest } from "@/utils/exceptions";
import { MRecord } from "@/schemas/slim-schemas";
import { ReMappedRecordFields } from "@/types";
import { argonAbs } from '@/utils';

/**
 * This formats for response and also compare 
 * ...hashed fields that were previously exempted
 * @param args 
 * @param logger 
 * @returns 
 */

export const postOperateRecord = async (args: {
    record: MRecord;
    allHashedFieldsInQuery?: { value: string | number, slug: string }[];
    reMappedRecordFields: ReMappedRecordFields;
    recordSpaceSlug: string;
    projectSlug: string;
    userId: string;
    projectId: string;
    options?: { noThrow: boolean }
}, logger: Logger) => {
    console.time("postOperateRecord")
    logger.sLog({ record: args.record, allHashedFields: Boolean(args.allHashedFieldsInQuery) }, "postOperateRecord");

    const { record, allHashedFieldsInQuery, recordSpaceSlug, projectSlug, reMappedRecordFields, userId, projectId, options = { noThrow: false } } = args;

    const hashedFields = {};

    const { _id, updatedAt, createdAt, fieldsContent } = record;
    const formattedRecord = { id: _id, updatedAt, createdAt } as any;
    for (let index = 0; index < fieldsContent.length; index++) {
        const { field, textContent, numberContent } = fieldsContent[index];
        const { slug: fieldSlug, hashed: fieldIsHashed } = reMappedRecordFields[field];
        const content = textContent || numberContent;
        const fieldKey = fieldSlug;
        const hashedFieldInQuery = allHashedFieldsInQuery && allHashedFieldsInQuery.length && allHashedFieldsInQuery.find(a => a.slug === fieldKey);

        const hashedFieldIsInQuery = Boolean(hashedFieldInQuery);

        if (hashedFieldIsInQuery) {
            const same = await argonAbs.compare(String(hashedFieldInQuery.value), content);
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

    return formattedRecord;
}