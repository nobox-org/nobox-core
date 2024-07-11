import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';
import { RecordStructureType } from '@/types';

export const validateFieldType = (args: {
   logger: typeof Logger;
   value: boolean | string | number | any[];
   type: RecordStructureType;
   name: string;
}) => {

   const {
      logger,
      value,
      type,
      name
   } = args;

   logger.sLog({ value, type }, 'validateFieldType');


   if (type === RecordStructureType.NUMBER && typeof value !== 'number') {
      return `Value for Body field: '${name}' should be a valid number`;
   }

   if (type === RecordStructureType.TEXT && typeof value !== 'string') {
      return `Value for Body field: '${name}' should be a valid string`;
   }

   if (type === RecordStructureType.BOOLEAN && typeof value !== 'boolean') {
      return `Value for Body field: '${name}' should be a valid boolean`;
   }

   if (
      type === RecordStructureType.OBJECT &&
      typeof value !== 'object'
   ) {
      return `Value for Body field: '${name}' should be a valid object`;
   }

   if (
      type === RecordStructureType.ARRAY &&
      Array.isArray(value) === false
   ) {
      return `Value for Body field: '${name}' should be a valid array`;
   }
}
