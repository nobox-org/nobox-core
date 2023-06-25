
import { CustomLogger as Logger } from "@/modules/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.schema";

const collectionName = "project-keys";

export interface Postmark {
    apiKey: string;

    senderEmail: string;
}

export interface Firebase {
    privateKey: string;
    projectId: string;
    clientEmail: string;
}

export interface MProjectKeys extends MBase {
    projectId: string;
    postmark?: Postmark;
    firebase?: Firebase;
}

export const getProjectKeysModel = (logger: Logger) => {
    const col = collection<MProjectKeys>(collectionName, logger);
    return col;
}

