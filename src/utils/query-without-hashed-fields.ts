import { CObject } from "@/types";
import { CustomLogger as Logger } from "@/logger/logger.service";

export const queryWithoutHashedFields = (args: {
    query: CObject,
    allHashedFieldsInQuery: { value: string | number, slug: string }[],
    logger: Logger;
}) => {
    const { query, allHashedFieldsInQuery, logger } = args;
    const _query = { ...query };
    if (allHashedFieldsInQuery.length) {
        logger.sLog({ queryWithoutHashedFields: _query }, 'queryWithoutHashedFields:: existing hashed query fields');
        for (const hashedField of allHashedFieldsInQuery) {
            const { slug, value: _ } = hashedField;
            delete _query[slug];
        }
        return _query;
    }
    logger.sLog({ queryWithoutHashedFields: _query }, 'queryWithoutHashedFields:: no hashed query fields');
    return _query;
};
