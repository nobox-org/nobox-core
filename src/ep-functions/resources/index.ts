import { login } from "./login";
import { sendOtp } from "./send-otp";
import { FunctionName, FunctionMetaData } from "./types";
import { sendEmail } from "./utils";


export const functionsMetaData: Record<FunctionName, FunctionMetaData> = {
    "login": login,
    "send-otp": sendOtp
}

export const utils = {
    sendEmail
}