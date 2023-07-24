import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { collection } from '@/utils/mongo';
import { MBase } from './base-model.schema';

const collectionName = 'project-users';

export interface MProjectUser extends MBase {
   projectId: string;
   email: string;
}

export const getProjectUsersModel = (logger: Logger) => {
   return collection<MProjectUser>(collectionName, logger);
};
