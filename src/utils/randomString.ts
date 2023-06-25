export default function() {
   return (
      Math.random()
         .toString(36)
         .substring(2, 6) +
      Math.random()
         .toString(36)
         .substring(2, 4)
   );
}
