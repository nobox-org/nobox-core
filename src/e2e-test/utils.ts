import { createUuid } from "@/utils";
import axios from "axios";

export const baseUrl = 'http://localhost:8000';

export const defaultHeaders = {
    'Content-Type': 'application/json',
    'accept': 'application/json, text/plain, /',
    'clear-all-spaces': 'false',
    'options': JSON.stringify({
        sort: { order: 'desc', by: 'id' },
    }),
};

export const authorizationHeaderObject = {
    'authorization': 'Bearer uj7dymd72ilgjgjsigayga1orjpcum5j5_trubjv' // local mongo token, to be updated by token from local installation
};

export const headersWithAuthorization = {
    ...defaultHeaders,
    ...authorizationHeaderObject
}

export const getRandomUuids = (length = 5) => {
    const uuids = [];
    for (let index = 0; index < length; index++) {
        uuids.push(createUuid())
    }
    return uuids;
}

export const getInferredStructure = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    sampleBody: Record<string, boolean | string | number | object | any[]>;
}) => {
    try {
        const { recordSpaceSlug, projectSlug, sampleBody } = args;
        const res = await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/get-inferred-structure`, sampleBody, {
            headers: headersWithAuthorization
        });
        return res.data;
    } catch (error) {
        console.log({ error }, "getInferredStructure");
        return null;
    }
}


export const setInferredStructure = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    sampleBody: Record<string, boolean | string | number | object | any[]>;
}) => {
    try {
        const { recordSpaceSlug, projectSlug, sampleBody } = args;
        const res = await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}/set-inferred-structure`, sampleBody, {
            headers: headersWithAuthorization
        });
        return res.data;
    } catch (error) {
        console.log({ error }, "getInferredStructure");
        return null;
    }
}

export const addRecords = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    body: Array<Record<string, boolean | string | number | object | any[]>>;
    inferredStructure: Record<any, any>;
}) => {
    try {
        const { recordSpaceSlug, projectSlug, body, inferredStructure } = args;

        await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, body, {
            headers: {
                ...defaultHeaders,
                ...authorizationHeaderObject,
                'structure': JSON.stringify(inferredStructure)
            }
        });
    } catch (error) {
        console.log("e2e:utils:addRecords", { error: error.response.data, requestId: error.response.headers["request-id"] })
    }
}


export const addRecordsWithPrestoredStructure = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    body: Array<Record<string, boolean | string | number | object | any[]>>;
}) => {
    try {
        const { recordSpaceSlug, projectSlug, body } = args;

        await axios.post(`${baseUrl}/${projectSlug}/${recordSpaceSlug}`, body, {
            headers: {
                ...defaultHeaders,
                ...authorizationHeaderObject,
                'use-pre-stored-structure': 'true'
            }
        });
    } catch (error) {
        console.log("e2e:utils:addRecordsWithPrestoredStructure", { error: error.response.data, requestId: error.response.headers["request-id"] })
    }
}

