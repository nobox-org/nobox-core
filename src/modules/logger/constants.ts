export const MODULE_NAME = 'ProjectLog';

const initDate = Date.now();

export const init = {
    date: initDate,
    $reading: false,
    $writing: false,
    saveInFile: true,
    logPool: [],
}