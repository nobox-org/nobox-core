
import { CustomLogger as Logger } from "@/logger/logger.service";
import { collection } from '@/utils/mongo';
import { MBase } from "./base-model.slim.schema";

const collectionName = "projects";

export interface Postmark {
    apiKey: string;

    senderEmail: string;
}

export interface Keys {
    postmark?: Postmark
}

export interface BusinessDetails {
    address?: string;
    name?: string;
};

export interface MProject extends MBase {
    name: string;

    description?: string;

    slug: string;

    siteUrl?: string;

    user: string;

    keys?: Keys;

    businessDetails?: BusinessDetails;
}

export const getProjectModel = (logger: Logger) => {
    const col = collection<MProject>(collectionName, logger, {
        indexes: [
            {
                key: { slug: 1, user: 1 },
                name: "slug1User1",
            },
        ]
    });
    return col;
}

