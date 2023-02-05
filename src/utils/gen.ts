import { EpSourceFunctionType } from "@/types";

export function getUnixTime() {
    return String((Date.now() / 1000) | 0);
}

export function isSameWhenStripped(str1: string, str2: string) {
    const formatString = (str: string) => str.replace(/\W/g, '').toLowerCase()
    return formatString(str1) === formatString(str2);
}

export const dummyResponseBySourceFunction = (sourceFunctionType: EpSourceFunctionType) => {
    switch (sourceFunctionType) {
        case "addRecord" || "updateRecord" || "updateRecordById" || "deleteRecord" || "deleteRecordById" || "getRecord":
            return {};
        case "getRecords" || "deleteRecords":
            return [];
        default:
            return {};
    }
}