import { Context, LoggerType, TraceInit } from "@/types";

export const contextGetter = (context: Context["req"], logger: LoggerType) => {
    return {
        getValue(args: [primaryKey: keyof Context["req"], secondaryKey?: any], options = { silent: false }) {

            const [
                primaryKey,
                secondaryKey,
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

            return value;
        },
        validateRecordContextUpdate(_record: TraceInit["records"][0]) {
            const record = { ..._record };
            const fieldsContentFieldIsPopulated = Boolean((record.fieldsContent[0].field as any)?.recordSpace);

            if (fieldsContentFieldIsPopulated) {
                logger.sLog({ record }, "context-getter::Cannot update records with populated fieldsContent.field")
                const fieldsContent = [...record.fieldsContent];
                logger.sLog({}, "context-getter:: started fieldsContent slimming")

                const newFieldsContent = [];

                for (let i = 0; i < fieldsContent.length; i++) {
                    const { field, _id: _unused, ...rest } = fieldsContent[i];
                    console.log({ field });
                    newFieldsContent.push({ ...rest, field: (field as any)._id.toString() });
                }

                record.fieldsContent = newFieldsContent;

                logger.sLog({ record }, "context-getter:: started fieldsContent slimmed down")
            }

            return record;
        },
        getFullContext() {
            return context;
        }
    }

}

