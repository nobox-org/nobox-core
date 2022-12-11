import { CustomLoggerInstance as Logger } from "@/logger/logger.service";
import { Context, ParamRelationship } from "@/types";
import { User } from "@/user/graphql/model";
import { createRecordCommandSyntax } from "./create-record-command-syntax";
import { createRecordQuerySyntax } from "./create-record-query-syntax";

export const createMongoDBSyntax = async (
    args: Partial<{
        recordQuery: Record<string, string>;
        recordDocument: Record<string, string>;
        user: User;
        paramRelationship: ParamRelationship;
        requiredFieldsAreOptional: boolean;
    }> & {
        context: Context;
        logger?: typeof Logger;
    },
) => {
    const { logger, context, recordQuery, recordDocument, user, paramRelationship = "And", requiredFieldsAreOptional = false } = args;

    logger.sLog(
        { recordQuery, recordDocument, user, paramRelationship, requiredFieldsAreOptional },
        'EpService:prepare',
    );

    const { recordSpace } = context.trace;
    const { _id: recordSpaceId, recordFields: recordSpaceRecordFields, slug: recordSpaceSlug } = recordSpace;

    const ret: Partial<{
        recordQuerySyntax: ReturnType<typeof createRecordQuerySyntax>;
        recordCommandSyntax: ReturnType<typeof createRecordCommandSyntax>;
    }> = {};

    if (recordQuery) {
        ret.recordQuerySyntax = createRecordQuerySyntax(
            recordSpaceSlug,
            recordSpaceId,
            recordQuery,
            recordSpaceRecordFields,
            logger,
            paramRelationship === "Or"
        );
    }

    if (recordDocument) {
        ret.recordCommandSyntax = createRecordCommandSyntax(
            recordSpaceId,
            recordDocument,
            recordSpaceRecordFields,
            logger,
            requiredFieldsAreOptional
        );
    }

    return ret;
}