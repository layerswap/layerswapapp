import axios from "axios";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = "https://api.layerswap.io";

    apiFetcher = (url: string) => axios.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
    }
}

