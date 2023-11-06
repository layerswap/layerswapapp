import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next'
import { validateSignature } from '../../helpers/validateSignature';
import { parseJwt } from '../../lib/jwtParser';
import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import { AuthConnectResponse } from '../../Models/LayerSwapAuth';
import { QueryParams } from '../../Models/QueryParams';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const query: QueryParams = req.query;
    const user_token = req.headers["authorization"]?.toString()?.split(" ")?.[1]
    if (!user_token) {
        return res.status(401).json({ error: { message: "User not authenticated" } })
    }
    const signatureIsValid = validateSignature(query)
    if (!signatureIsValid) {
        res.status(500).json({ error: { message: "Not valid signature" } })
        return
    }
    if (query.appName === "imxMarketplace") {
        try {
            const auth = await getAccessToken();
            const { sub } = parseJwt(user_token) || {}
            await verifyWallet(query, sub, auth.access_token)
            res.status(200).json({ status: "ok" })
            return
        }
        catch (e) {
            if (e?.response?.data?.error)
                res.status(500).json({ error: e?.response?.data?.error })
            return
        }
    }
    else {
        res.status(500)
    }
}

const getAccessToken = async (): Promise<AuthConnectResponse> => {
    const params = new URLSearchParams();
    params.append('client_id', 'layerswap_bridge_internal');
    params.append('grant_type', 'client_credentials');
    params.append('client_secret', process.env.INTERNAL_API_SECRET || "");
    var apiClient = new LayerSwapApiClient();
    const settings = await apiClient.GetSettingsAsync()
    const identity_url = settings?.data?.discovery?.identity_url
    const auth = axios.post<AuthConnectResponse>(`${identity_url}/connect/token`, params, { headers: { 'content-type': 'application/x-www-form-urlencoded' } })

    return (await auth).data;
}

const verifyWallet = async (query: QueryParams, user_id: string, access_token: string) => {
    const data = {
        "address": query.destAddress,
        "network": query.destNetwork,
        "user_id": user_id
    }
    const res = axios.post<AuthConnectResponse>(`${LayerSwapApiClient.apiBaseEndpoint}/api/internal/whitelisted_addresses`, data, { headers: { "Content-Type": "application/json", "Authorization": 'Bearer ' + access_token } })
    return (await res).data;
}