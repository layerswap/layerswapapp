import axios from "axios";
import LayerSwapApiClient from "./apiClients/layerswapApiClient";

export const InitializeAuthInstance = (baseURL?: string) => {

    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
    });

    instance.interceptors.request.use(
        async (config) => {
            const apiKey = LayerSwapApiClient.apiKey

            if (apiKey) {
                config.headers["X-LS-APIKEY"] = apiKey
            } else {
                throw new Error("NEXT_PUBLIC_API_KEY is not set up in env vars")
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return instance;
}

export const InitializeUnauthInstance = (baseURL?: string) => {

    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
    });

    instance.interceptors.request.use(
        async (config) => {
            const apiKey = LayerSwapApiClient.apiKey

            if (apiKey) {
                config.headers["X-LS-APIKEY"] = apiKey
            } else {
                throw new Error("NEXT_PUBLIC_API_KEY is not set up in env vars")
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return instance;
}


export default InitializeAuthInstance;