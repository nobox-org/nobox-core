import { MRecordField } from "nobox-shared-lib";

export const getQueryFieldDetails = (
   queryField: any,
   fieldsDetail: MRecordField[],
   logger: any,
) => {
   logger.sLog({ queryField, fieldsDetail }, 'getQueryFieldDetails');
   for (let index = 0; index < fieldsDetail.length; index++) {
      const fieldDetail = fieldsDetail[index];
      if (fieldDetail.name === queryField) {
         return fieldDetail;
      }
   }
   return null;
};
