export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
    const timeoutMs = init?.timeoutMs ?? 60000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(id);
    }
}

export default fetchWithTimeout;

