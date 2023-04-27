import { CustomLogger as Logger } from '@/logger/logger.service';
import { MRecordDump, MRecordSpace } from "@/schemas/slim-schemas";
import { ReMappedRecordFields } from "@/types";
import { argonAbs } from '@/utils';

/**
 * This formats for response and also compare 
 * ...hashed fields that were previously exempted
 * @param args 
 * @param logger 
 * @returns 
 */

export const postOperateRecordDump = async (args: {
    recordDump: MRecordDump;
    allHashedFieldsInQuery?: { value: string | number, slug: string }[];
    reMappedRecordFields: ReMappedRecordFields;
}, logger: Logger) => {
    const rand = Math.random();
    console.time("postOperateRecordDump" + rand);
    logger.sLog({ allHashedFields: Boolean(args.allHashedFieldsInQuery), reMappedRecordFields: args.reMappedRecordFields }, "postOperateRecordDump");

    const { recordDump, allHashedFieldsInQuery, reMappedRecordFields } = args;
    const { record: recordDetails, ...recordValues } = recordDump;
    const { fieldsContent } = recordDetails;
    const _record = { ...recordValues };

    for (let index = 0; index < fieldsContent.length; index++) {
        const { field } = fieldsContent[index];
        logger.sLog({ index, fieldsContent }, "postOperateRecordDump:: looping throught fieldsContent");

        const { slug: fieldSlug, hashed: fieldIsHashed } = reMappedRecordFields[field];

        const content = recordValues[fieldSlug];
        const hashedFieldInQuery = allHashedFieldsInQuery?.length && allHashedFieldsInQuery.find(a => a.slug === fieldSlug);
        const hashedFieldIsInQuery = Boolean(hashedFieldInQuery);

        if (hashedFieldIsInQuery) {
            const same = await argonAbs.compare(String(hashedFieldInQuery.value), content, logger);
            if (!same) {
                return null;
            }
        }

        if (fieldIsHashed) {
            delete _record[fieldSlug];
        }
    }

    console.timeEnd("postOperateRecordDump" + rand);

    return _record;
}