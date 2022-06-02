import axios from "axios";
import TokenService from "./TokenService";

const instance = axios.create({
    baseURL: "https://localhost:5019",
    headers: {
        "Content-Type": "application/json",
    },
});

instance.interceptors.request.use(
    (config) => {
        const token = TokenService.getAuthData()?.access_token;
        if (token) {
            config.headers['Accept'] = 'application/json';
            config.headers["Authorization"] = 'Bearer ' + token;  // for Spring Boot back-end
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
        if (originalConfig.url !== "/connect/token" && err.message === 'Network Error') {
            // Access Token was expired
            if (!originalConfig._retry) { //err.response.status === 401 && 
                originalConfig._retry = true;
                try {
                    const config = {...originalConfig}
                    config.headers['Accept'] = 'application/x-www-form-urlencoded';

                    const params = new URLSearchParams();

                    params.append('client_id', 'layerswap_ui');
                    params.append('grant_type', 'refresh_token');
                    params.append('refresh_token', TokenService.getAuthData()?.refresh_token);
                    //application/x-www-form-urlencoded
                    const rs = await instance.post("/connect/token", params);
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