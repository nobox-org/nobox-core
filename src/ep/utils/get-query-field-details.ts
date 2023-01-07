import { MRecordField } from "@/schemas";

export const getQueryFieldDetails = (queryField: any, fieldsDetail: MRecordField[], logger: any) => {
    logger.sLog({ queryField, fieldsDetail }, "getQueryFieldDetails");
    for (let index = 0; index < fieldsDetail.length; index++) {
        const fieldDetail = fieldsDetail[index];
        if (fieldDetail.slug === queryField) {
            return fieldDetail;
        }
    }
    return null;
}