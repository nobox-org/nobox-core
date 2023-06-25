import { CustomLogger } from '@/modules/logger/logger.service';
import { throwBadRequest } from './exceptions';

export const epFunctionBodyValidation = (args: {
   body: Record<any, any>;
   compulsoryParams: string[];
   logger: CustomLogger;
}) => {
   const { body, compulsoryParams, logger } = args;

   if (!compulsoryParams) {
      return;
   }

   const sentKeys = Object.keys(body);
   for (let i = 0; i < compulsoryParams.length; i++) {
      const compulsoryParam = compulsoryParams[i];
      if (!sentKeys.includes(compulsoryParam)) {
         const error = `Missing compulsory parameter: "${compulsoryParam}"`;
         logger.sLog({}, error);
         throwBadRequest(error);
      }
   }
};
