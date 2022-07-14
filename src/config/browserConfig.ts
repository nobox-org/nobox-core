import {
    BROWSER_ADDRESS,
    BROWSER_PROTOCOL
} from './mainConfig';

export const browserProtocol: string = BROWSER_PROTOCOL;

export const browserAddress: string = BROWSER_ADDRESS;

export const browserFullAddress = `${browserProtocol}://${browserAddress}`;

