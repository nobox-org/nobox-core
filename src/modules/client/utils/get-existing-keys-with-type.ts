import { MRecordField } from "@/schemas";

export const getExistingKeysWithType = (fields: MRecordField[]) => {
    let message = '';
    for (let index = 0; index < fields.length; index++) {
        const { slug, type } = fields[index];
        message += `${slug}:${type} `
    }
    return message;
}
