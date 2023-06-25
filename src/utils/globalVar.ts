//Initialize Global Object
globalThis._nobox_ = {} as any;

export const setGlobalVar = (key: any, value: any) => {
    globalThis._nobox_[key] = value
}

export const getGlobalVar = (key: any) => {
    return globalThis._nobox_[key]
}
