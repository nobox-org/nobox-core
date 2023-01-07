import { MRecordFieldContent } from "@/schemas";


const removeObjectWithMatchingFields = (
    update: MRecordFieldContent[],
    fieldToMatch: string,
    exempt = "_unknown_"
) => {
    const result = [];
    for (let i = 0; i < update.length; i++) {
        const { [exempt]: _ = "unknown_value", field, ...rest } = update[i] as any;
        const fieldInUpdateAsString = field.toString();
        if (fieldInUpdateAsString !== fieldToMatch) {
            result.push({ ...rest, field: fieldInUpdateAsString });
        };
    }

    return result;
}

export const mergeFieldContent = (args: {
    existingRecordUpdate: MRecordFieldContent[],
    newRecordUpdate: MRecordFieldContent[]
}) => {
    const { existingRecordUpdate, newRecordUpdate } = args;
    let mergedUpdate = [...existingRecordUpdate];

    for (let i = 0; i < newRecordUpdate.length; i++) {
        const eachNewRecordUpdate = newRecordUpdate[i];
        const { field } = eachNewRecordUpdate;
        const fieldAsString = field.toString();
        mergedUpdate = removeObjectWithMatchingFields(mergedUpdate, fieldAsString);
        mergedUpdate.push({ ...eachNewRecordUpdate, field: fieldAsString });
    }


    return mergedUpdate;
}
