import axios from "axios";
import { parseJwt } from "./jwtParser";
import TokenService from "./TokenService";
import { AuthRefreshFailedError } from './Errors/AuthRefreshFailedError';

type TokenStates = {
    AccessTokenExpires: number;
    RefreshTokenExpires: number;
    RefreshingToken: boolean;
}

const refreshTokenState: TokenStates = {
    AccessTokenExpires: 0,
    RefreshTokenExpires: 0,
    RefreshingToken: false,
}

export const InitializeAuthInstance = (baseURL?: string) => {

    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
    });

    async function RefreshAccessToken(refresh_token: string): Promise<boolean> {
        try {
            refreshTokenState.RefreshingToken = true

            const params = new URLSearchParams();
            params.append('client_id', 'layerswap_bridge_ui');
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refresh_token);

            const rs = await instance.post("/connect/token", params, { headers: { 'Accept': "application/json, text/plain, */*", 'Content-Type': "application/x-www-form-urlencoded;charset=UTF-8", 'Access-Control-Allow-Origin': '*' } });
            const res = rs.data;
            const { exp } = parseJwt(res.access_token) || {}
            refreshTokenState.AccessTokenExpires = exp
            TokenService.setAuthData(res)
            return true
        }
        catch {
            TokenService.removeAuthData()
            return false
        }
        finally {
            refreshTokenState.RefreshingToken = false
        }
    }

    instance.interceptors.request.use(
        async (config) => {
            const authData = TokenService.getAuthData()
            let access_token = authData?.access_token;
            let refresh_token = authData?.refresh_token;

            if (!refreshTokenState.AccessTokenExpires && access_token && refresh_token) {
                const { exp } = parseJwt(access_token) || {}
                if (exp)
                    refreshTokenState.AccessTokenExpires = exp
            }

            if (refresh_token && !refreshTokenState.RefreshingToken && refreshTokenState.AccessTokenExpires < Math.floor(Date.now() * 0.001)) {
                let couldRefresh = await RefreshAccessToken(refresh_token)
                if (!couldRefresh) {
                    return Promise.reject(new AuthRefreshFailedError());
                }
            }

            let token = TokenService.getAuthData()?.access_token;
            const apiKey = process.env.NEXT_PUBLIC_API_KEY

            if (apiKey) {
                config.headers["X-LS-APIKEY"] = apiKey
            } else {
                throw new Error("NEXT_PUBLIC_API_KEY is not set up in env vars")
            }

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
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                if (!originalConfig._retry && !refreshTokenState.RefreshingToken) {
                    originalConfig._retry = true;
                    const config = { ...originalConfig }
                    let goToAuth = false;
                    try {
                        const refresh_token = TokenService.getAuthData()?.refresh_token
                        if (refresh_token) {
                            const couldRefreshToken = await RefreshAccessToken(refresh_token);
                            if (couldRefreshToken) {
                                return instance(config);
                            }
                        }
                        goToAuth = true;
                    } catch (_error) {
                        goToAuth = true;
                    }

                    if (goToAuth) {
                        return Promise.reject(new AuthRefreshFailedError());
                    }
                }
            }
            return Promise.reject(err);
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
            const apiKey = process.env.NEXT_PUBLIC_API_KEY

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