import { CustomLoggerInstance } from "@/logger/logger.service";

export default async function (readStream: any): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        readStream.on("data", async (dataChunk) => {
            CustomLoggerInstance.log("","readStreamPromise: buffering")
            data += dataChunk;
        });

        readStream.on("end", async () => {
            resolve(data);
        });

        readStream.on("error", async (err) => {
            reject(err)
        })
    })
}
