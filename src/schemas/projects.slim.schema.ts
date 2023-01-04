
import { CustomLogger as Logger } from "@/logger/logger.service";

import { collection } from '@/utils/direct-mongo-connection';
import { ObjectId } from "mongodb";

export const collectionName = "projects";

export interface Postmark {
    apiKey: string;

    senderEmail: string;
}

export interface Keys {
    postmark: Postmark
}

export interface BusinessDetails {
    address?: string;
    name?: string;
};

export class MProject {
    _id?: string;

    name: string;

    description?: string;

    slug: string;

    siteUrl?: string;

    user: string;

    keys?: Keys;

    businessDetails?: BusinessDetails;
}

export const getProjectModel = (logger: Logger) => {
    const col = collection<MProject>(collectionName, logger);
    return col;
}

