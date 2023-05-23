export const convertPlainObjectToComparativeArray = (obj: Record<any, any>, node: string) => {
    const orQuery = { [node]: [] };

    for (const key in obj) {
        const query = {};
        query[key] = obj[key];
        orQuery[node].push(query);
    }

    return orQuery;
}