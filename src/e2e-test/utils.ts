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
    'authorization': 'Bearer b8hgtm3jn9bfms_cdmjj6zms_rm6mz41t2oa2-p1'
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
    sampleBody: Record<string, boolean | string | number | any[]>;
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
    sampleBody: Record<string, boolean | string | number | any[]>;
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