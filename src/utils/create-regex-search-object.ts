export function createRegexSearchObject(fields: string[], search: string) {
    const regexObject = { $or: [] };

    for (const field of fields) {
        regexObject.$or.push({
            [field]: {
                $regex: search,
                $options: 'i'
            }
        });
    }

    return regexObject;
}