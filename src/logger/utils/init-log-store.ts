import * as fs from "fs";
import { LOG_STORE_NAME, MODULE_NAME, init } from "../constants";
import { wrappedLog } from "./wrapped-log";

export function initLogStore() {
    if (!init.saveInFile) {
        return;
    }

    const fileName = LOG_STORE_NAME;

    try {
        if (fs.existsSync(LOG_STORE_NAME)) {
            return;
        }

        // If Store is Not Created yet
        wrappedLog(`${MODULE_NAME}: create log Storage, location: ${LOG_STORE_NAME} `);
        const logStore = [];
        logStore.push({
            date: init.date,
            value: 'firstLogEver',
            tag: 'Some Tag',
        });
        const stringedJSON = JSON.stringify(logStore);
        fs.writeFile(fileName, stringedJSON, function (
            err: NodeJS.ErrnoException | null,
        ) {
            if (err) {
                return wrappedLog('Log Module Error:', err);
            }

            wrappedLog('Log Store Successfully Created');
        });
    } catch (err) {
        console.error(err);
    }
}