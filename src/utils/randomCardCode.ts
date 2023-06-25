export const randomNumbers = (length = 16) => {
   const pickList =
      '012345673478902345678901923456789010123456782345601223456789527839047825';
   const shuffle = (str: string) =>
      str
         .split('')
         .sort(function() {
            return 0.5 - Math.random();
         })
         .join('');
   return shuffle(pickList).substr(0, length);
};
