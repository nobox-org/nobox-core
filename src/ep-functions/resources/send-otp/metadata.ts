import { FunctionsMetaData } from '../types';

export interface SendOtpFunctionResources {
    otpRecordSpaceStructure: string;
}

export const sendOtpFunctionMetaData: FunctionsMetaData = {
    name: 'send-otp',
};
