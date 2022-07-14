export function screenFields(dbObj: Record<any, any>, fields: string[]): any {
    const obj = {...dbObj};
    for (let i = 0; i < fields.length; i++) {
        const element = fields[i];
        delete obj[element];
    }
    return obj;
}