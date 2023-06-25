const objectCheck = (objectValue: Record<any, any>) => {
   const objectKeys = Object.keys(objectValue);
   let numberFilled = 0;
   let numberUnfilled = 0;
   const unfilledFields = [];
   const filledFields = [];
   for (let index = 0; index < objectKeys.length; index++) {
      const eachKey = objectKeys[index];
      if (!objectValue[eachKey]) {
         numberUnfilled++;
         unfilledFields.push(eachKey);
         continue;
      }
      numberFilled++;
      filledFields.push(eachKey);
   }

   return {
      numberFilled,
      numberUnfilled,
      unfilledFields,
      filledFields,
      allEmpty: unfilledFields.length === objectKeys.length,
      allFields: filledFields.length === objectKeys.length,
   };
};

export default objectCheck;
