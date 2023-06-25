/* eslint-disable @typescript-eslint/ban-types */
export function perfTime() {
   return function<TFunction extends Function>(target: TFunction) {
      const className = target.prototype.constructor.name;
      for (const prop of Object.getOwnPropertyNames(target.prototype)) {
         const classProperty: any = target.prototype[prop];
         if (classProperty instanceof Function) {
            const functionIsAsync = isMethodAsync(classProperty);
            const timeIdentifier = `PerfTimer::${className}::${prop}`;

            if (functionIsAsync) {
               target.prototype[prop] = async function(...args: unknown[]) {
                  const argsWithThis = [this, [...args]];
                  console.time(timeIdentifier);
                  const func = await classProperty.apply(...argsWithThis);
                  console.timeEnd(timeIdentifier);
                  return func;
               };
            }

            if (!functionIsAsync) {
               target.prototype[prop] = function(...args: unknown[]) {
                  const argsWithThis = [this, [...args]];
                  console.time(timeIdentifier);
                  const func = classProperty.apply(...argsWithThis);
                  console.timeEnd(timeIdentifier);
                  return func;
               };
            }
         }
      }
   };
}

const isMethodAsync = (func: () => any) => {
   return String(func).substring(0, 5) === 'async';
};
