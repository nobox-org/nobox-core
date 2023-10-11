
export function convertBooleanStringsToBooleans<T extends Record<any, any>, Y extends Record<any, any>>(obj: T): Y {
   const result: Record<any, any> = {
      ...obj
   };

   for (const key in obj) {
      const value = obj[key];
      if (value === 'true') {
         result[key] = true;
      } else if (value === 'false') {
         result[key] = false;
      }
   }

   return result;
}