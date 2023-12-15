import { MRecordFieldContent } from "nobox-shared-lib";
import { CustomLogger as Logger } from '@/modules/logger/logger.service';

const removeObjectWithMatchingFields = (
   update: MRecordFieldContent[],
   fieldToMatch: string,
   exempt = '_unknown_',
) => {
   const result = [];
   for (let i = 0; i < update.length; i++) {
      const { [exempt]: _ = 'unknown_value', field, ...rest } = update[
         i
      ] as any;
      const fieldInUpdateAsString = field.toString();
      if (fieldInUpdateAsString !== fieldToMatch) {
         result.push({ ...rest, field: fieldInUpdateAsString });
      }
   }

   return result;
};

export const mergeFieldContent = (
   args: {
      existingFieldContent: MRecordFieldContent[];
      newFieldContent: MRecordFieldContent[];
   },
   Logger: Logger,
) => {
   Logger.sLog(
      {
         existingFieldContent: args.existingFieldContent,
         newFieldContent: args.newFieldContent,
      },
      'ep-functions::utils::mergeFieldContent',
   );
   const { existingFieldContent, newFieldContent } = args;

   let mergedFieldContent = [...existingFieldContent];

   for (let i = 0; i < newFieldContent.length; i++) {
      const eachNewRecordUpdate = newFieldContent[i];
      const { field } = eachNewRecordUpdate;
      const fieldAsString = field.toString();
      mergedFieldContent = removeObjectWithMatchingFields(
         mergedFieldContent,
         fieldAsString,
      );
      mergedFieldContent.push({ ...eachNewRecordUpdate, field: fieldAsString });
   }

   return mergedFieldContent;
};
