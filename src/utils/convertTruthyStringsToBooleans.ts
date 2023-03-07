export const convertTruthyStringsToBooleans = (obj: Record<string, any>) => {
    for (const key in obj) {
        if (obj[key] === 'true') {
            obj[key] = true;
        } else if (obj[key] === 'false') {
            obj[key] = false;
        }
    }
    return obj;
};