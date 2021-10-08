import axios from "axios";

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = "https://api.layerswap.io";

    apiFetcher = (url: string) => axios.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);
}

