import axios from "axios";
import { AuthGetCodeResponse, AuthConnectResponse } from "../Models/LayerSwapAuth";



export default class LayerSwapAuthApiClient {
    static identityBaseEndpoint: string = getIdentityBasePath()

    async getCodeAsync(email): Promise<AuthGetCodeResponse> {
        return await axios.post(LayerSwapAuthApiClient.identityBaseEndpoint + '/api/auth/get_code',
            { email },
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data);
    }

    async connectAsync(email: string, code: string): Promise<AuthConnectResponse> {
        const params = new URLSearchParams();
        params.append('client_id', 'layerswap_bridge_ui');
        params.append('grant_type', 'passwordless');
        params.append('email', email);
        params.append('code', code);

        return await axios.post(LayerSwapAuthApiClient.identityBaseEndpoint + '/connect/token', params, { headers: { 'Access-Control-Allow-Origin': '*' } }).then(res => res.data);
    }

    async guestConnectAsync(): Promise<AuthConnectResponse> {
        const params = new URLSearchParams();
        params.append('client_id', 'layerswap_bridge_ui');
        params.append('grant_type', 'credentialless');

        return await axios.post(LayerSwapAuthApiClient.identityBaseEndpoint + '/connect/token', params, { headers: { 'Access-Control-Allow-Origin': '*' } }).then(res => res.data);
    }
}

function getIdentityBasePath() {
    const res = process.env.NEXT_PUBLIC_IDENTITY_BASE_PATH
    if (!res) {
        throw new Error("NEXT_PUBLIC_IDENTITY_API is not set up in env vars")
    }
    return res
}