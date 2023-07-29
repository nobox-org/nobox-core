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
   allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, Authorization, auto-create-record-space, auto-create-project, structure, options, function-resources, token, mutate, clear-all-spaces, webhooks',
   methods: 'GET,PUT,POST,DELETE,UPDATE,OPTIONS',
   credentials: true,
});
