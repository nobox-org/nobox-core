import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { throwBadRequest } from '@/utils/exceptions';
import { MRecord, MRecordFieldContent } from "nobox-shared-lib";
import { CObject, ReMappedRecordFields, RecordStructureType } from '@/types';
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
<<<<<<< HEAD

      const {
         field,
         textContent,
         numberContent,
         objectContent,
         booleanContent,
         arrayContent,
      } = fieldsContent[index] as (MRecordFieldContent & {objectContent: any});

=======
      const fieldContent = fieldsContent[index];
      const { field } = fieldContent;
>>>>>>> fbcf59832484b51474eccbbec414745a6b2937c9
      const recordField = reMappedRecordFields?.[field];

      if (!recordField) {
         logger.sLog({ field }, "postOperateRecord:: skipped non-existing field",)
         continue;
      }

      const {
         slug: _fieldSlug,
         hashed: fieldIsHashed,
         name: fieldName,
         type,
      } = recordField;

      const content = getContent({
         fieldContent,
         type,
         logger,
         fieldIsHashed
      });

      const fieldKey = fieldName;
      const hashedFieldInQuery = allHashedFieldsInQuery?.length && allHashedFieldsInQuery.find(a => a.slug === fieldKey);

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
   fieldContent: MRecordFieldContent;
   type: RecordStructureType;
   logger: Logger;
   fieldIsHashed: boolean;
}) => {
   const {
      fieldContent,
      type,
      logger,
      fieldIsHashed
   } = args;

   const {
      textContent,
      numberContent,
      booleanContent,
      arrayContent,
      objectContent
   } = fieldContent

   const content: any = textContent ?? numberContent ?? booleanContent ?? arrayContent ?? objectContent;

   if (fieldIsHashed) {
      return content;
   }

   if (type === RecordStructureType.BOOLEAN) {

      if (typeof content === 'boolean') {
         return content;
      }

      if (typeof content === 'string') {
         return content === 'true' ? true : false;
      }
   }

   if (type === RecordStructureType.NUMBER) {
      return Number(content);
   }

   if (type === RecordStructureType.ARRAY || type === RecordStructureType.OBJECT) {
      return JSON.parse(content);
   }

   if (type === RecordStructureType.TEXT) {
      return String(content);
   }

   logger.sLog(
      { content, type },
      'postOperateRecord::getContent:: Invalid type for field',
   );
   throwBadRequest(`Invalid type for content : ${content}`);
};
