export type ErrorDetails = {
    message: string;
    name?: string;
    stack?: string;
    status?: number;
    statusText?: string;
    responseData?: unknown;
    requestUrl?: string;
    code?: string;
}

export function extractErrorDetails(error: unknown): ErrorDetails {
    const err = error as Error & {
        response?: { status?: number; statusText?: string; data?: unknown };
        request?: { url?: string };
        code?: string;
        cause?: unknown;
    };

    return {
        message: err?.message || String(error),
        name: err?.name,
        stack: err?.stack,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseData: err?.response?.data,
        requestUrl: err?.request?.url,
        code: err?.code,
    };
}
