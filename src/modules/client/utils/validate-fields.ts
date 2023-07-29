import { CreateRecordSpaceInput } from '@/modules/record-spaces/dto/create-record-space.input';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RecordFieldStructureType } from '@/types';
import { FunctionMetaData } from '@/modules/client-functions/resources/types';

export const validateFields = (args: {
   recordFieldStructure: CreateRecordSpaceInput['recordFieldStructure'];
   fields: Record<string, any>;
   logger: typeof Logger;
   functionMetaData?: FunctionMetaData;
}) => {
   const {
      logger,
      fields,
      recordFieldStructure,
      functionMetaData = {} as FunctionMetaData,
   } = args;
   logger.sLog({ fields, recordFieldStructure, functionMetaData }, 'validateFields');

   const matchedFields = [];

   const { mustExistFields = [], name: functionName } = functionMetaData;

   let unMatchedMustExistFields = [...mustExistFields];

   const unMatchedMustExistFieldsTypeErrors = [];

   const checkForMustExistFields = !!mustExistFields.length;

   const typeErrors = [];

   for (let index = 0; index < recordFieldStructure.length; index++) {
      const { slug, type } = recordFieldStructure[index];
      const value = fields[slug];

      if (checkForMustExistFields) {
         const mustExistFieldSlugMatch = mustExistFields.find(
            field => field.slug === slug,
         );

         if (mustExistFieldSlugMatch) {
            unMatchedMustExistFields = unMatchedMustExistFields.filter(
               field => field.slug !== slug,
            );
            const { type: expectedType } = mustExistFieldSlugMatch;
            if (type !== expectedType) {
               unMatchedMustExistFieldsTypeErrors.push(
                  `field With Slug: "${slug}" should be a type: "${expectedType}" to work with function:${functionName}`,
               );
            }
         }
      }

      if (value) {
         matchedFields.push(value);
         if (type === RecordFieldStructureType.NUMBER && isNaN(value)) {
            typeErrors.push(`${slug} should be a number value`);
         }
      }
   }

   const mustExistFieldsErrors = [
      ...unMatchedMustExistFieldsTypeErrors,
      ...unMatchedMustExistFields.map(
         ({ slug }) =>
            `field With Slug:${slug} was not found in the recordSpace as expected by function:${functionName}`,
      ),
   ];

   return {
      errors: [...mustExistFieldsErrors, ...typeErrors],
      typeErrors,
      matchedFields,
      mustExistFieldsErrors,
   };
};
