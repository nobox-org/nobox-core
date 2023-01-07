import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const moduleName = 'ProjectLog';

const initDate = Date.now();

const saveInFile = true;

interface ILog {
  date: number;
  data: string;
  action: any;
  traceId: string;
}



const wrappedLog = (...args: any[]) => {
  console.log(...args);
};

const logPool: ILog[] = [];

const logStoreName = path.resolve(__dirname, './logstore.json');

let $reading = false;
let $writing = false;

export function logExecute(item: ILog) {

  if (saveInFile) {
    logPool.push(item);
    storeLog();
  }
}

async function storeLog() {
  const index = 0;
  while (logPool.length > 0) {
    const log = logPool[index];
    if (!$reading && !$writing) {
      // Read
      const read = await readFile(logStoreName, 'utf8');
      // Update
      const logStore = JSON.parse(read || '[{}]'); // Parse
      logStore.push(log);
      const stringifiedJSON = JSON.stringify(logStore);

      // write and Recall StoreLog() when Done;
      writeFile(logStoreName, stringifiedJSON, storeLog);

      logPool.shift(); // remove from Pool
      continue; // Jump To Next
    }
    break; // Break While Loop to Avoid Unnecessary Looping
  }
}

export function parseTime(unixTimestamp) {
  const date = new Date(unixTimestamp);
  const hours = date.getHours();
  const minutes = '0' + date.getMinutes();
  const seconds = '0' + date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const formattedTime =
    hours +
    ':' +
    minutes.substr(-2) +
    ':' +
    seconds.substr(-2) +
    ' ' +
    milliseconds;
  return formattedTime;
}


function initLogStore() {
  if (!saveInFile) {
    return;
  }

  const fileName = logStoreName;
  try {
    if (fs.existsSync(logStoreName)) {
      return;
    }
    // If Store is Not Created yet
    wrappedLog(`${moduleName}: create log Storage, location: ${logStoreName} `);
    const logStore = [];
    logStore.push({
      date: initDate,
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


const readFile = (fileName: string, encoding: any): any =>
  new Promise((resolve, reject) => {
    $reading = true;
    fs.readFile(fileName, encoding, function (err: NodeJS.ErrnoException, data: string) {
      $reading = false;
      if (err) {
        reject(err);
      }
      resolve(data as string);
    });
  });

const writeFile = (
  fileName: string,
  fileToWrite: string,
  postWrite: () => any,
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

export { initLogStore };
