import { RecordFieldStructureType } from '@/types';
import { FunctionMetaData } from '../types';

export const sendOtp: FunctionMetaData = {
   name: 'send-otp',
   mustExistFields: [
      {
         slug: 'otp',
         type: RecordFieldStructureType.TEXT,
      },
   ],
};
