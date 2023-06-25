export default function stringInject(
   str: string,
   data: Record<string, any>,
   variableFormat: string,
) {
   if (Object.keys(data).length === 0) {
      return str;
   }

   const [
      openingTagOne,
      openingTagTwo,
      ...closingTagChars
   ] = variableFormat.replace('variables', '');

   const closingTag = closingTagChars
      .map(each => {
         return `\\${each}`;
      })
      .join('');

   const openingTag = `${openingTagOne}${openingTagTwo}`
      .split('')
      .map(each => {
         return `\\${each}`;
      })
      .join('');

   const regString = `(${openingTag}([^${closingTag}]+)${closingTag})`;

   const regEx = new RegExp(regString, 'g');
   const openRegex = new RegExp(openingTag);
   const closeRegex = new RegExp(closingTag as string);

   for (const key in data) {
      return str.replace(regEx, i => {
         const key = i.replace(openRegex, '').replace(closeRegex, '');
         const dataValue = data[key];
         return !dataValue ? i : dataValue;
      });
   }
   return str;
}
