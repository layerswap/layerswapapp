import { TonClient } from "@ton/ton";

export const createTonClient = (apiKey?: string) => {
    return new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey || ''
    });
};
