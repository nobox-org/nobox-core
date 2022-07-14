import { ReadStream as FSReadStream } from "fs";

import { WriteStream } from "fs-capacitor";

export interface FileUpload {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream(name?: string): ReadStream;
    capacitor: typeof WriteStream;
}

export class ReadStream extends FSReadStream {}