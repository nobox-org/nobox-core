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
   const startTime = performance.now();

   const result = await processFunction({
      func,
      logger: _logger,
   });

   processTime({
      tag,
      context,
      startTime,
      logger: _logger,
   });

   return result;
};

export const processTime = (args: {
   tag: string;
   context?: Context;
   logger?: Logger;
   startTime: number;
}) => {
   const { logger, tag, context, startTime } = args;

   try {
      const presentTime = performance.now();
      const diff = presentTime - startTime;

      if (context.req?.trace) {
         context.req.trace.dbTimes.push({
            sourceTag: tag,
            time: String(diff),
         });
      }

      logger.sLog(
         { time: diff },
         `${tag}:: measureTimeTaken::: ${diff}`,
         'redBright',
      );
   } catch (error) {
      logger.sLog({ error }, 'measureTimeTaken::processTime::error');
   }
};

export const processFunction = async (args: { func: any; logger?: Logger }) => {
   const { func, logger } = args;

   try {
      const a = await func;
      return a;
   } catch (error) {
      logger.sLog({ error }, 'measureTimeTaken::processFunction::error');
      return;
   }
};
