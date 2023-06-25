import { throwBadRequest } from '@/utils/exceptions';

const METHODS_WITH_PREOPERATION = Symbol('METHODS_WITH_PREOPERATION');
const DEFAULT_OPERATION_METHOD_NAME = 'preOperation';

export function preOperate(args = { with: DEFAULT_OPERATION_METHOD_NAME }) {
   return function(target: any, propertyKey: string) {
      target[METHODS_WITH_PREOPERATION] =
         target[METHODS_WITH_PREOPERATION] || new Map();
      target[METHODS_WITH_PREOPERATION].set(propertyKey, args.with);
   };
}

export function handlePreOperation(a?: string, b?: string) {
   // eslint-disable-next-line @typescript-eslint/ban-types
   return function<TFunction extends Function>(target: TFunction) {
      const className = target.prototype.constructor.name;

      const methodsWithPreOperation =
         target.prototype[METHODS_WITH_PREOPERATION];
      for (const prop of methodsWithPreOperation) {
         const [method, preOperation] = prop;
         const oldFunc: () => any = target.prototype[method];
         target.prototype[method] = async function(...args: unknown[]) {
            try {
               const preOperationByFirstDepth = a ? this[a] : null;
               const preOperationBySecondDepth = b ? this[a][b] : null;
               const preOperationByDepth =
                  preOperationBySecondDepth || preOperationByFirstDepth || null;

               await (preOperationByDepth
                  ? preOperationByDepth(...args)
                  : this[preOperation](...args));
               const updatedArgs = [...args];
               return oldFunc.apply(this, updatedArgs);
            } catch (error) {
               this.logger.debug(`${className}::${prop}:error`, error);
               throwBadRequest(error);
            }
         };
      }
   };
}
