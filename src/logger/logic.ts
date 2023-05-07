import { LOG_STORE_NAME, init } from './constants';
import { ILog } from './type';
import { readFile } from './utils/read-file';
import { writeFile } from './utils/write-file';

export function logExecute(log: ILog) {
  const { saveInFile } = init;

  if (saveInFile) {
    storeLog(log);
  }
}

export async function storeLog(log: ILog) {
  const { $reading, $writing } = init;
  if ($reading && $writing) {
    // Read
    const read = await readFile(LOG_STORE_NAME, 'utf8', $reading);

    // Update
    const logStore = JSON.parse(read || '[{}]'); // Parse

    console.log({ logStore, log })

    logStore.push(log);

    console.log({ logStore })

    const stringifiedJSON = JSON.stringify(logStore);

    // write and Recall StoreLog() when Done;
    writeFile(LOG_STORE_NAME, stringifiedJSON, storeLog, $writing);
  }
}

