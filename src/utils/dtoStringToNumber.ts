const convertObjectStringsToNumber = <T>(
   objectValue: Record<any, any>,
   options: {
      exempt?: string[];
   } = {},
): T => {
   const objectKeys = Object.keys(objectValue);
   const newObjectKeys = {} as T;
   for (let index = 0; index < objectKeys.length; index++) {
      const eachKey = objectKeys[index];
      newObjectKeys[eachKey] = options?.exempt?.includes(eachKey)
         ? objectValue[eachKey]
         : parseInt(objectValue[eachKey]);
   }
   return newObjectKeys;
};

export default convertObjectStringsToNumber;
