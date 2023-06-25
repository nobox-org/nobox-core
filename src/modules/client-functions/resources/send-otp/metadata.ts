import { RecordStructureType } from '@/types';
import { FunctionMetaData } from '../types';

export const sendOtp: FunctionMetaData = {
   name: 'send-otp',
   mustExistFields: [
      {
         slug: 'otp',
         type: RecordStructureType.TEXT,
      },
   ],
};
