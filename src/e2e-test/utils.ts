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
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGV0YWlscyI6eyJfaWQiOiI2NDNjMjA5MzQxYzFhNTk1NWEyYjg0ZDEiLCJlbWFpbCI6ImplZ2VkZWFraW50dW5kZUBnbWFpbC5jb20iLCJwaWN0dXJlIjoiaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE3MDMzNzU5P3Y9NCIsImZpcnN0TmFtZSI6IkFraW50dW5kZSIsImxhc3ROYW1lIjpudWxsLCJjcmVhdGVkQXQiOiIyMDIzLTA0LTE2VDE2OjIxOjM5LjIyMVoiLCJ1cGRhdGVkQXQiOiIyMDIzLTA0LTE2VDE2OjIxOjM5LjIyMVoifSwiaWF0IjoxNjk3MDAwNzg0LCJleHAiOjE2OTcxMzAzODR9.hjcanzYN0zS41SzVWS2GLjGx7Js1pxf2U05Jq6v4yUQ'
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