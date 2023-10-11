import { ClientHeaderKeys } from "@/modules/client/type";
const clientHeaderKeysAsAString = Object.values(ClientHeaderKeys).join(',');

export const corsOptionsDelegate = (ipWhitelist: string[], Logger: any) => ({
   origin: (requestOrigin: string, callback: any) => {
      if (ipWhitelist[0] === '*') {
         Logger.log(`CORS: Allowed ${requestOrigin} by wildcard`);
         return callback(null, true);
      }

      const nonServerRequest =
         requestOrigin === undefined ? 'Non-Server Request' : requestOrigin;
      const whiteListed = ipWhitelist.indexOf(requestOrigin) !== -1;
      const allowed = whiteListed || nonServerRequest === 'Non-Server Request';
      allowed
         ? Logger.log(`CORS: Allowed ${nonServerRequest}`)
         : Logger.debug(
            `CORS: blocked ${nonServerRequest}`,
            `ALLOWED LINKS: ${ipWhitelist} `,
         );
      return callback(null, allowed);
   },
   allowedHeaders: clientHeaderKeysAsAString,
   methods: 'GET,PUT,POST,DELETE,UPDATE,OPTIONS',
   credentials: true,
});
