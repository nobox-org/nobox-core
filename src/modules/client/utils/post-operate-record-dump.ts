import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { MRecordDump } from "@nobox-org/shared-lib";
import { ReMappedRecordFields } from '@/types';
import { argonAbs } from '@/utils';

/**
 * This formats for response and also compare
 * ...hashed fields that were previously exempted
 * @param args
 * @param logger
 * @returns
 */

export const postOperateRecordDump = async (
   args: {
      recordDump: MRecordDump;
      allHashedFieldsInQuery?: { value: string | number; slug: string }[];
      reMappedRecordFields: ReMappedRecordFields;
   },
   logger: Logger,
) => {
   logger.sLog(
      {
         allHashedFields: Boolean(args.allHashedFieldsInQuery),
         reMappedRecordFields: args.reMappedRecordFields,
      },
      'postOperateRecordDump',
   );

   const { recordDump, reMappedRecordFields } = args;
   const { record: recordDetails, ...recordValues } = recordDump;
   const _record = { ...recordValues };

   for (const fieldId of Object.keys(reMappedRecordFields)) {
      const {
         hashedFieldIsInQuery,
         fieldIsHashed,
         hashedFieldInQuery,
         content,
         fieldSlug,
      } = getRecordMetaData({ ...args, fieldId, logger });

      if (hashedFieldIsInQuery) {
         const same = await argonAbs.compare(
            String(hashedFieldInQuery.value),
            content,
            logger,
         );
         if (!same) {
            return null;
         }
      }

      if (fieldIsHashed) {
         delete _record[fieldSlug];
      }
   }

   return _record;
};

const getRecordMetaData = (args: {
   recordDump: MRecordDump;
   allHashedFieldsInQuery?: { value: string | number; slug: string }[];
   reMappedRecordFields: ReMappedRecordFields;
   fieldId: string;
   logger: Logger;
}) => {
   //args.logger.sLog({}, "getRecordMetaData");
   const {
      reMappedRecordFields,
      recordDump,
      allHashedFieldsInQuery,
      fieldId,
   } = args;

   const recordFieldData = reMappedRecordFields[fieldId];
   const { slug: fieldSlug, hashed: fieldIsHashed } = recordFieldData;

   const content = recordDump[fieldSlug];
   const hashedFieldInQuery =
      allHashedFieldsInQuery?.length &&
      allHashedFieldsInQuery.find(a => a.slug === fieldSlug);
   const hashedFieldIsInQuery = Boolean(hashedFieldInQuery);

   return {
      hashedFieldIsInQuery,
      fieldIsHashed,
      hashedFieldInQuery,
      content,
      fieldSlug,
   };
};
