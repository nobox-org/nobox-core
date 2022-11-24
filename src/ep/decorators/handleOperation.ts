export function handleOperation() {
    return function <TFunction extends Function>(target: TFunction) {
        for (let prop of Object.getOwnPropertyNames(target.prototype)) {
            if (prop === 'preOperation') continue;
            if (prop === 'prepare') continue;
            let oldFunc: Function = target.prototype[prop];
            if (oldFunc instanceof Function) {
                target.prototype[prop] = async function () {
                    this['preOperation'](arguments);
                    return oldFunc.apply(this, arguments);
                }
            }
        }
    }
}