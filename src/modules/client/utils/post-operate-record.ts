import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { MRecord } from '@/schemas';
import { CObject, ReMappedRecordFields, RecordFieldStructureType } from '@/types';
import { argonAbs } from '@/utils';

/**
 * This formats for response and also compare
 * ...hashed fields that were previously exempted
 * @param args
 * @param logger
 * @returns
 */

export const postOperateRecord = async (
   args: {
      record: MRecord;
      allHashedFieldsInQuery?: { value: string | number; slug: string }[];
      reMappedRecordFields: ReMappedRecordFields;
      recordSpaceSlug: string;
      projectSlug: string;
      options?: { noThrow: boolean };
      afterRun?: (args: { fullFormattedRecord: CObject }) => Promise<void>;
   },
   logger: Logger,
) => {
   console.time('postOperateRecord');
   logger.sLog(
      {
         record: args.record,
         allHashedFields: Boolean(args.allHashedFieldsInQuery),
      },
      'postOperateRecord',
   );

   const {
      record,
      allHashedFieldsInQuery,
      recordSpaceSlug,
      projectSlug,
      reMappedRecordFields,
      afterRun,
      options = { noThrow: false },
   } = args;
   const hashedFields = {};

   const { _id, updatedAt, createdAt, fieldsContent } = record;
   const formattedRecord = { id: String(_id), updatedAt, createdAt };
   for (let index = 0; index < fieldsContent.length; index++) {
      const {
         field,
         textContent,
         numberContent,
         booleanContent,
         arrayContent,
      } = fieldsContent[index];
      const {
         slug: fieldSlug,
         hashed: fieldIsHashed,
         name: fieldName,
         type,
      } = reMappedRecordFields[field];
      const content = getContent({
         field,
         textContent,
         numberContent,
         booleanContent,
         arrayContent,
         type,
         logger,
      });
      const fieldKey = fieldName;
      const hashedFieldInQuery =
         allHashedFieldsInQuery &&
         allHashedFieldsInQuery.length &&
         allHashedFieldsInQuery.find(a => a.slug === fieldKey);

      const hashedFieldIsInQuery = Boolean(hashedFieldInQuery);

      if (hashedFieldIsInQuery) {
         const same = await argonAbs.compare(
            String(hashedFieldInQuery.value),
            String(content),
            logger,
         );
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

   const fullFormattedRecord = { ...formattedRecord, ...hashedFields };

   console.timeEnd('postOperateRecord');

   if (!options.noThrow && !formattedRecord) {
      logger.debug(
         `No records found after formatting for project : ${projectSlug}, recordSpaceSlug: ${recordSpaceSlug}`,
         'postOperateRecord',
      );
      throwBadRequest(`No records found for your request`);
   }

   if (afterRun) {
      await afterRun({ fullFormattedRecord });
   }

   return formattedRecord;
};

const getContent = (args: {
   field: string;
   textContent: string;
   numberContent: string;
   booleanContent: string;
   arrayContent: string;
   type: RecordFieldStructureType;
   logger: Logger;
}) => {
   const {
      textContent,
      numberContent,
      booleanContent,
      arrayContent,
      type,
      logger,
   } = args;

   const content: any =
      textContent ?? numberContent ?? booleanContent ?? arrayContent;

   if (type === RecordFieldStructureType.BOOLEAN) {
      return content === 'true' ? true : false;
   }

   if (type === RecordFieldStructureType.NUMBER) {
      return Number(content);
   }

   if (type === RecordFieldStructureType.ARRAY) {
      return JSON.parse(content);
   }

   if (type === RecordFieldStructureType.TEXT) {
      return String(content);
   }

   logger.sLog(
      { content, type },
      'postOperateRecord::getContent:: Invalid type for field',
   );
   throwBadRequest(`Invalid type for content : ${content}`);
};
