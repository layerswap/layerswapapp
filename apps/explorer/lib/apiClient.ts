import type { ApiResponse } from "@layerswap/widget/types";

const DEFAULT_API_URL = "https://api.layerswap.io";

const apiBaseUrl = (process.env.NEXT_PUBLIC_LS_API?.trim() || DEFAULT_API_URL).replace(/\/$/, "");
const apiKey = process.env.NEXT_PUBLIC_API_KEY?.trim();

export class ApiClientError extends Error {
    public readonly response: { status: number; data: unknown };

    constructor(status: number, data: unknown,) {
        super(`Layerswap API request failed with status ${status}`);
        this.name = "ApiClientError";
        this.response = { status, data };
    }
}

async function fetcher<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${apiBaseUrl}/api/v2${path}`, { headers: apiKey ? { "X-LS-APIKEY": apiKey } : undefined, });
    const data: unknown = await response.json().catch(() => undefined);

    if (!response.ok)
        throw new ApiClientError(response.status, data);

    return data as ApiResponse<T>;
}

export const apiClient = { fetcher };
