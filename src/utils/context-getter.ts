import { MRecordField, MRecordSpace } from "nobox-shared-lib";
import { Context, HydratedRecordSpace, LoggerType, TraceInit } from "@/types";

/**
 *  This function is used to hydrate the recordSpace object
 * @param recordSpace 
 * @returns 
 */
export const hydrateRecordSpace = (recordSpace: MRecordSpace): HydratedRecordSpace => {
    const reMappedRecordFields = reMapRecordFields(recordSpace.hydratedRecordFields);
    return {
        ...recordSpace,
        reMappedRecordFields,
    };
};

/**
 *  This function is used to remap the recordFields as an object
 * @param recordFields 
 * @returns 
 */

export const reMapRecordFields = (recordFields: MRecordField[]) => {
    const newRecordFields = {} as Record<string, MRecordField>;
    for (let index = 0; index < recordFields.length; index++) {
        const recordField = recordFields[index] as MRecordField;
        newRecordFields[recordField._id.toString()] = recordField;
    }
    return newRecordFields;
};

/**
 *  This function is used to get and set the context value
 * @param context 
 * @param logger 
 * @returns 
 */

export const contextGetter = (context: Context["req"], logger: LoggerType) => {
    return {
        getValue<T = any>(args: [primaryKey: keyof Context["req"], secondaryKey?: any, tertiaryKey?: any], options = { silent: false }): T {

            const [
                primaryKey,
                secondaryKey,
                tertiaryKey
            ] = args;


            const { silent } = options;

            let value = context[primaryKey]

            if (!value && !silent) {
                logger.sLog({ primaryKey }, "contextGetter::error:: context value for key is not set")
                throw new Error(`Context value for primaryKey: ${String(primaryKey)} is not yet set`)
            }

            if (secondaryKey) {
                value = value[secondaryKey];
            }

            if (!value && !silent) {
                logger.sLog({ primaryKey, secondaryKey }, "contextGetter::error:: context value for secondaryKey is not set")
                throw new Error(`Context value for primaryKey: ${String(primaryKey)} and secondaryKey: ${String(secondaryKey)} is not yet set`)
            }


            if (tertiaryKey) {
                value = value[tertiaryKey];
            }

            if (!value && !silent) {
                logger.sLog({ primaryKey, secondaryKey, tertiaryKey, context }, "contextGetter::error:: context value for tertiaryKey is not set")
                throw new Error(`Context value for primaryKey: ${String(primaryKey)} and secondaryKey: ${String(secondaryKey)} and tertiaryKey: ${String(tertiaryKey)} is not yet set`)
            }

            return value;
        },
        validateRecordContextUpdate(_record: TraceInit["records"][0]) {
            logger.sLog({ _record }, "context-getter::validateRecordContextUpdate")
            const record = { ..._record };
            const fieldsContentFieldIsPopulated = Boolean((record?.fieldsContent?.[0]?.field as any)?.recordSpace);

            if (fieldsContentFieldIsPopulated) {
                logger.sLog({ record }, "context-getter::Cannot update records with populated fieldsContent.field")
                const fieldsContent = [...record.fieldsContent];
                logger.sLog({}, "context-getter:: started fieldsContent slimming")

                const newFieldsContent = [];

                for (let i = 0; i < fieldsContent.length; i++) {
                    const { field, ...rest } = fieldsContent[i];
                    newFieldsContent.push({ ...rest, field: (field as any)._id.toString() });
                }

                record.fieldsContent = newFieldsContent;

                logger.sLog({ record }, "context-getter:: started fieldsContent slimmed down")
            }

            return record;
        },
        assignRecordSpace(recordSpace: MRecordSpace): HydratedRecordSpace {
            return hydrateRecordSpace(recordSpace);
        },
        getFullContext() {
            return context;
        }
    }
}

