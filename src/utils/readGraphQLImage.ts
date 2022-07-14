import { BufferedFile } from "@/types";
import { FileUpload } from "graphql-upload-minimal";
import { throwBadRequest } from "./exceptions";
import readStreamPromise from "./readStreamPromise";

 export default async function  (file: FileUpload): Promise<BufferedFile> {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      throwBadRequest("File type is not supported");
    }
    const readStream = file.createReadStream();
    const bufferData = await readStreamPromise(readStream);
    return {
      buffer: bufferData,
      originalname: file.filename,
      encoding: 'utf8',
      fieldname: 'profile image',
      mimetype: file.mimetype
    };
  }