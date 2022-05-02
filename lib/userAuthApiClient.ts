import axios from "axios";
import { AuthGetCodeResponse, AuthConnectResponse } from "../Models/LayerSwapAuth";


export default class LayerSwapAuthApiClient {
    static apiBaseEndpoint: string = "https://bransfer-connect-api-dev.azurewebsites.net";
    static identityBaseEndpoint: string = "https://bransfer-connect-identity-dev.azurewebsites.net";

    async getCodeAsync(email): Promise<AuthGetCodeResponse> {
        return await axios.post(LayerSwapAuthApiClient.apiBaseEndpoint + '/api/auth/get_code', { email }).then(res => res.data);
    }

    async connectAsync(email, code): Promise<AuthConnectResponse> {
        const params = new URLSearchParams();
        params.append('client_id', 'layerswap_ui');
        params.append('grant_type', 'passwordless');
        params.append('scopes', 'user_data');
        params.append('email', email);
        params.append('code', code);

        return await axios.post(LayerSwapAuthApiClient.identityBaseEndpoint + '/connect/token', params).then(res => res.data);
    }
}
