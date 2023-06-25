import * as fs from 'fs';

export const readFile = (
   fileName: string,
   encoding: any,
   $reading: boolean,
): any =>
   new Promise((resolve, reject) => {
      $reading = true;
      fs.readFile(fileName, encoding, function(
         err: NodeJS.ErrnoException,
         data: string,
      ) {
         $reading = false;
         if (err) {
            reject(err);
         }
         resolve(data as string);
      });
   });
