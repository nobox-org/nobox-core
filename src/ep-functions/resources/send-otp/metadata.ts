import { RecordStructureType } from '@/record-spaces/dto/record-structure-type.enum';
import { FunctionMetaData } from '../types';

export const sendOtp: FunctionMetaData = {
    name: 'send-otp',
    mustExistFields: [{
        slug: "otp",
        type: RecordStructureType.TEXT
    }],
};
