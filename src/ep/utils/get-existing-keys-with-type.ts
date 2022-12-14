import { RecordField } from "@/schemas";

export const getExistingKeysWithType = (fields: RecordField[]) => {
    let message = '';
    for (let index = 0; index < fields.length; index++) {
        const { slug, type } = fields[index];
        message += `${slug}:${type} `
    }
    return message;
}
