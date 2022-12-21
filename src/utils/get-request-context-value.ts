import { Context, LoggerType } from "@/types";

export const getContextValue = (context: Context, logger: LoggerType, primaryKey: keyof Context, secondaryKey?: any) => {
    let value = context[primaryKey]

    if (!value) {
        logger.sLog({ primaryKey }, "getContextValue::error:: context value for key is not set")
        throw new Error(`Context value for primaryKey: ${String(primaryKey)} is not yet set`)
    }

    if (secondaryKey) {
        value = value[secondaryKey];
    }

    if (!value) {
        logger.sLog({ primaryKey, secondaryKey }, "getContextValue::error:: context value for secondaryKey is not set")
        throw new Error(`Context value for primaryKey: ${String(primaryKey)} and secondaryKey: ${String(secondaryKey)} is not yet set`)
    }

    return value;


}
