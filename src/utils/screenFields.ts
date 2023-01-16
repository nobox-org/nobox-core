export function screenFields<T>(dbObj: T, fields: (keyof T)[]): any {
    const obj = { ...dbObj };
    for (let i = 0; i < fields.length; i++) {
        const element = fields[i];
        delete obj[element];
    }
    return obj;
}