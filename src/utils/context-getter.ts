import { Context, LoggerType } from "@/types";

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
        getFullContext() {
            return context;
        },
    }

}

