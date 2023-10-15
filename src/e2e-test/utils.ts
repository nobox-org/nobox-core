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
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGV0YWlscyI6eyJfaWQiOiI2NDNjMjA5MzQxYzFhNTk1NWEyYjg0ZDEiLCJlbWFpbCI6ImplZ2VkZWFraW50dW5kZUBnbWFpbC5jb20iLCJwaWN0dXJlIjoiaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE3MDMzNzU5P3Y9NCIsImZpcnN0TmFtZSI6IkFraW50dW5kZSIsImxhc3ROYW1lIjpudWxsLCJjcmVhdGVkQXQiOiIyMDIzLTA0LTE2VDE2OjIxOjM5LjIyMVoiLCJ1cGRhdGVkQXQiOiIyMDIzLTA0LTE2VDE2OjIxOjM5LjIyMVoifSwiaWF0IjoxNjk3Mzk2ODQ1LCJleHAiOjE2OTc1MjY0NDV9.zrAwcbyAxce2TNF53ggsyktUlL_ZHpYHsTlexVfdBfs'
};

export const headersWithAuthorization = {
    ...defaultHeaders,
    ...authorizationHeaderObject
}

export const getRandomUuids = (length: number = 5) => {
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

export const addRecords = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    body: Array<Record<string, boolean | string | number | any[]>>;
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
        console.log("e2e:utils:addRecords", { error: error.response.data })
    }
}


export const addRecordsWithPrestoredStructure = async (args: {
    projectSlug: string;
    recordSpaceSlug: string;
    body: Array<Record<string, boolean | string | number | any[]>>;
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
        console.log("e2e:utils:addRecordsWithPrestoredStructure", { error: error.response.data })
    }
}

