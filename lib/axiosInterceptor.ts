import axios from "axios";
import TokenService from "./TokenService";
import LayerSwapAuthApiClient from "./userAuthApiClient";

const instance = axios.create({
    baseURL: LayerSwapAuthApiClient.identityBaseEndpoint,
    headers: {
        "Content-Type": "application/json",
    },
});

instance.interceptors.request.use(
    (config) => {
        const token = TokenService.getAuthData()?.access_token;
        if (token) {
            config.headers["Authorization"] = 'Bearer ' + token;  
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
instance.interceptors.response.use(
    (res) => {
        return res;
    },
    async (err) => {
        
        const originalConfig = err.config;
        if (originalConfig.url !== "/connect/token" && err?.response?.status === 401) {
            // Access Token was expired
            if (!originalConfig._retry) { //err.response.status === 401 && 
                originalConfig._retry = true;
                try {
                    const config = { ...originalConfig }
                    const params = new URLSearchParams();
                    params.append('client_id', 'layerswap_bridge_ui');
                    params.append('grant_type', 'refresh_token');
                    params.append('refresh_token', TokenService.getAuthData()?.refresh_token);
                    //application/x-www-form-urlencoded
                    const rs = await instance.post("/connect/token", params, { headers: { 'Accept': "application/json, text/plain, */*", 'Content-Type': "application/x-www-form-urlencoded;charset=UTF-8", 'Access-Control-Allow-Origin': '*' } });
                    const res = rs.data;
                    TokenService.setAuthData(res);
                    return instance(config);
                } catch (_error) {
                    TokenService.removeAuthData()
                    return Promise.reject(_error);
                }
            }
        }
        return Promise.reject(err);
    }
);



export default instance;