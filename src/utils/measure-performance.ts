import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { Context } from '@/types';

export const measureTimeTaken = async (args: {
   func: any;
   tag: string;
   context?: Context;
   logger?: Logger;
}) => {
   const { func, logger, tag, context } = args;
   const _logger = logger || new Logger();
   const t0 = performance.now();
   const a = await func;
   const t1 = performance.now();
   const diff = t1 - t0;

   if (context) {
      context.req.trace.dbTimes.push({
         sourceTag: tag,
         time: String(diff),
      });
   }

   _logger.sLog(
      { time: diff },
      `${tag}:: measureTimeTaken::: ${diff}`,
      'redBright',
   );
   return a;
};
