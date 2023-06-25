import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import * as admin from 'firebase-admin';

export const getFirebaseAdminInstance = (args: {
   projectId: string;
   clientEmail: string;
   privateKey: string;
   logger: Logger;
}): admin.app.App => {
   const { projectId, clientEmail, privateKey, logger } = args;
   logger.sLog(
      { appExist: Boolean(admin.apps?.[0]) },
      'getFirebaseAdminInstance',
   );
   try {
      const app = admin.initializeApp({
         credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
         }),
      });
      return app;
   } catch (error) {
      if (admin.app.length) {
         logger.sLog(
            {},
            'getFirebaseAdminInstance::catch returning existing app[0]',
         );
         return admin.apps[0];
      }
      throw error;
   }
};
