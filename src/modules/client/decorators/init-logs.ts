const DEFAULT_LOGGER_OPTIONS = { name: 'logger', method: 'sLog' };

export function initLogs(
   args: { logger?: { name: string; method: string } } = {},
) {
   const { logger = DEFAULT_LOGGER_OPTIONS } = args;
   const { name, method } = logger;
   return function<TFunction extends () => any>(target: TFunction) {
      const className = target.prototype.constructor.name;
      for (const prop of Object.getOwnPropertyNames(target.prototype)) {
         // eslint-disable-next-line @typescript-eslint/ban-types
         const oldFunc: Function = target.prototype[prop];
         if (oldFunc instanceof Function) {
            target.prototype[prop] = async function(...args: unknown[]) {
               this[name][method](...args, `${className}::${prop}`);
               return oldFunc.apply(this, ...args);
            };
         }
      }
   };
}
