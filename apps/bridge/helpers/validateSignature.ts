import { enc, HmacSHA256 } from "crypto-js";
import { QueryParams } from "../Models/QueryParams";

export function validateSignature(queryParams: QueryParams): boolean {
    //One day
    const PERIOD_IN_MILISECONDS = 86400000
    if (!queryParams.timestamp || !queryParams.signature || Number(queryParams.timestamp) < new Date().getTime() - PERIOD_IN_MILISECONDS)
        return false

    const secret = JSON.parse(process.env.PARTNER_SECRETS || "{}")?.[queryParams.appName || '']?.[queryParams.apiKey || ""]
    if (!secret)
        return false;
    const paraps: QueryParams = { ...queryParams }
    const parnerSignature = paraps.signature
    delete paraps.signature;
    let dataToSign = formatParams(paraps);
    let signature = hmac(dataToSign, secret);
    return signature === parnerSignature
}
export const formatParams = (queryParams) => {
    // Sort params by key
    let sortedValues = Object.entries(queryParams).sort(([a], [b]) => a > b ? 1 : -1);

    // Lowercase all the keys and join key and value "key1=value1&key2=value2&..."
    return sortedValues.map(([key, value]) => `${key.toLowerCase()}=${value}`).join('&');
}
const hmac = (data, secret) => {
    // Compute the signature as a HEX encoded HMAC with SHA-256 and your Secret Key
    const token = enc.Hex.stringify(HmacSHA256(data.toString(enc.Utf8), secret));
    return token;
}