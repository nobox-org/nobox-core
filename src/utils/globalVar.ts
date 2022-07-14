//Initialize Global Object
globalThis._third_ = {} as any;

export const setGlobalVar = (key: any, value: any) => {
    globalThis._third_[key] = value
}

export const getGlobalVar = (key: any) => {
    return globalThis._third_[key]
}
