import { Request } from 'express';

export const generateCurlCommandFromRequest = (req: Request): string => {
   const method = req.method;
   const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
   const headers = req.headers;

   let command = `curl -X ${method} '${url}'`;

   for (const [key, value] of Object.entries(headers)) {
      command += ` -H '${key}: ${value}'`;
   }

   if (req.body) {
      const requestBody = JSON.stringify(req.body).replace(/'/g, "\\'");
      command += ` -d '${requestBody}'`;
   }

   return command;
};
