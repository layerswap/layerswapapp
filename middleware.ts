import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import LayerSwapApiClient from './lib/layerSwapApiClient';
import axios from 'axios';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
    const { nextUrl: { search } } = request;
    const urlSearchParams = new URLSearchParams(search);
    const addressSource = urlSearchParams.get('addressSource')
    if (addressSource === 'imxMarketplace') {
        // const validateSignature()
        const res = await getAccessToken();
        console.log(res)
    }
    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/'],
}


const getAccessToken = async () => {
    const params = new URLSearchParams();
    params.append('client_id', 'layerswap_bridge_internal');
    params.append('grant_type', 'client_credentials');
    params.append('client_secret', 'cmZahvBKO00BBjpWAMV5');

    const response = await fetch('https://identity-api-dev.layerswap.cloud/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: params
    })

    return await response.json();
}