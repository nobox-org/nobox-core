export function parseTime(unixTimestamp) {
   const date = new Date(unixTimestamp);
   const hours = date.getHours();
   const minutes = '0' + date.getMinutes();
   const seconds = '0' + date.getSeconds();
   const milliseconds = date.getMilliseconds();
   const formattedTime =
      hours +
      ':' +
      minutes.substr(-2) +
      ':' +
      seconds.substr(-2) +
      ' ' +
      milliseconds;
   return formattedTime;
}
