import { CObject, RecordStructureType } from "@/types";

export const convertBooleanQueryField = (args: {
    headers: any;
    query: CObject;
}) => {

    const { headers, query } = args;
    console.log({ abg: headers.structure });

    const recordStructures = (headers?.structure as any)?.recordFieldStructures;

    if (!recordStructures) {
        return query;
    }

    const convertedQuery = { ...query };

    for (let i = 0; i < recordStructures.length; i++) {
        const structure = recordStructures[i];
        const { type, slug } = structure;
        const isBoolean = type === RecordStructureType.BOOLEAN;
        if (isBoolean) {
            const value = query[slug]
            if (typeof value === 'string') {
                convertedQuery[slug] = value === 'true';
            }
        }
    }

    return convertedQuery;
}

