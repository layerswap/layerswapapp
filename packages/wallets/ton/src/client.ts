import { AppSettings } from "@layerswap/widget/internal";
import { TonClient } from "@ton/ton";

const tonClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: AppSettings.TonClientConfig.tonApiKey
});

export default tonClient;