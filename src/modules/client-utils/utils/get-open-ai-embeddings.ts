import { OPENAI_API_KEY } from '@/config/resources/process-map';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import axios, { AxiosResponse } from 'axios';

export const getOpenAIEmbeddings = async (texts: string[], logger: Logger): Promise<Record<string, number[]>> => {
    try {
        logger.sLog({}, "getOpenAIEmbeddings");

        const url = 'https://api.openai.com/v1/embeddings';

        const data = {
            input: texts,
            model: 'text-embedding-3-small'
        };


        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        return mapOpenAIEmbeddings(response, texts);

    } catch (error) {
        logger.sLog(error, "getOpenAIEmbeddings");
    }
}

const mapOpenAIEmbeddings = (response: AxiosResponse<any, any>, texts: string[]) => {
    const dataArr = response.data.data;

    const obj = {};

    for (let i = 0; i < dataArr.length; i++) {
        const element = dataArr[i];
        obj[texts[i]] = element.embedding;
    }

    return obj;
}


