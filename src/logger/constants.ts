import * as path from "path";

export const MODULE_NAME = 'ProjectLog';

export const LOG_STORE_NAME = path.resolve(__dirname, './logstore.json');

const initDate = Date.now();

export const init = {
    date: initDate,
    $reading: false,
    $writing: false,
    saveInFile: true,
    logPool: [],
}