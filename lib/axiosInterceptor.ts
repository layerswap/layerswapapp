import axios from "axios";
import { NextRouter } from "next/router";
import { AuthData } from "../context/authContext";
import { parseJwt } from "./jwtParser";
import TokenService from "./TokenService";
import LayerSwapAuthApiClient from "./userAuthApiClient";




type TokenStates = {
    AccessTokenExpires: number;
    RefreshTokenExpires: number;
    RefreshingToken: boolean;
}

const REFRESH_BEFORE = 3

const refreshTokenState: TokenStates = {
    AccessTokenExpires: 0,
    RefreshTokenExpires: 0,
    RefreshingToken: false,
}



export const InitializeInstance = (router?: NextRouter, redirect?: string) => {

    const instance = axios.create({
        baseURL: LayerSwapAuthApiClient.identityBaseEndpoint,
        headers: {
            "Content-Type": "application/json",
        },
    });

    async function RefreshAccessToken(refresh_token: string) {
        try {
            refreshTokenState.RefreshingToken = true

            const params = new URLSearchParams();
            params.append('client_id', 'layerswap_bridge_ui');
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refresh_token);
            //application/x-www-form-urlencoded
            const rs = await instance.post("/connect/token", params, { headers: { 'Accept': "application/json, text/plain, */*", 'Content-Type': "application/x-www-form-urlencoded;charset=UTF-8", 'Access-Control-Allow-Origin': '*' } });
            const res = rs.data;
            const { exp } = parseJwt(res.access_token) || {}
            refreshTokenState.AccessTokenExpires = exp
            TokenService.setAuthData(res)
        }
        catch (e) {
            TokenService.removeAuthData()
            router && router.push({
                pathname: '/auth',
                query: { redirect: redirect }
            })
            throw new Error("Could not authenticate")
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
                await RefreshAccessToken(refresh_token)
            }

            let token = TokenService.getAuthData()?.access_token;
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
                    try {
                        const refres_token = TokenService.getAuthData()?.refresh_token
                        const config = { ...originalConfig }
                        if (!refres_token)
                            return instance(config);
                        await RefreshAccessToken(refres_token)
                        return instance(config);
                    } catch (_error) {
                        router && router.push({
                            pathname: '/auth',
                            query: { redirect: redirect }
                        })
                        throw new Error("Could not authenticate")
                    }
                }
            }
            return Promise.reject(err);
        }
    );

    return instance;
}


export default InitializeInstance;