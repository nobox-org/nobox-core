
const DEFAULT_LOGGER_OPTIONS = { name: "logger", method: "sLog" };

export function initLogs(args: { logger?: { name: string, method: string } } = {}) {
    const { logger = DEFAULT_LOGGER_OPTIONS } = args;
    const { name, method } = logger;
    return function <TFunction extends Function>(target: TFunction) {
        const className = target.prototype.constructor.name;
        for (let prop of Object.getOwnPropertyNames(target.prototype)) {
            let oldFunc: Function = target.prototype[prop];
            if (oldFunc instanceof Function) {
                target.prototype[prop] = async function () {
                    this[name][method](arguments, `${className}::${prop}`);
                    return oldFunc.apply(this, arguments);
                }
            }
        }
    }
}