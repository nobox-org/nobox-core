export const randomNumbers = (length: number = 16) => {
    const pickList = '012345670123456789023456789012345601234789234567890123456789527839047825';
    const shuffle = (str: string) => str.split('').sort(function () { return 0.5 - Math.random() }).join('');
    return shuffle(pickList).substr(0, length);

}