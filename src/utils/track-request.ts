
import { getLogsModel, MLogs } from 'nobox-shared-lib';
import { CustomLoggerInstance as Logger } from '@/modules/logger/logger.service';


export const trackRequest = {
    init: async (logDetails: MLogs) => {
        const logs = getLogsModel(Logger);
        logs.insert(logDetails);
    },
    addUser: async (requestId: string, userId: string) => {
        const logs = getLogsModel(Logger);
        logs.findOneAndUpdate({ requestId }, {
            $set: {
                userId
            }
        });
    },
}


