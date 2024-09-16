import { TonClient } from "@ton/ton";

const tonClient = new TonClient({
    endpoint: process.env.NEXT_PUBLIC_API_VERSION == 'sandbox' ? 'https://testnet.toncenter.com/api/v2/jsonRPC' : 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.NEXT_PUBLIC_TON_API_KEY,
});

export default tonClient;