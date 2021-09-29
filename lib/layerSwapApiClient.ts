import axios from "axios";

export interface ApiResponse<T> {
    data: T;
    isLoading: boolean;
    isError: boolean;
}

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = "https://api.layerswap.io";
    apiFetcher = (url: string) => axios.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data)
}

