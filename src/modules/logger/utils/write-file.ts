import { AnyFunction } from '@/types';
import * as fs from 'fs';

export const writeFile = (
    fileName: string,
    fileToWrite: string,
    postWrite: AnyFunction,
    $writing: boolean
) =>
    new Promise((resolve, reject) => {
        $writing = true;
        fs.writeFile(fileName, fileToWrite, err => {
            $writing = false;
            postWrite();

            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
