export interface JsonRpcRequest<P> {
  jsonrpc: '2.0';
  method: string;
  params: P;
  id: number;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcResponse<R> {
  jsonrpc: '2.0';
  result?: R;
  error?: JsonRpcError;
  id: number;
}

export class JsonRpcClient {
  private url: string;
  private nextId = 1;

  constructor(url: string) {
    this.url = url;
  }

  async call<P, R>(method: string, params: P, timeoutMs?: number, retryCount?: number): Promise<R> {
    const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout.js");
    const request: JsonRpcRequest<P> = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.nextId++,
    };

    const { retry } = await import("@/lib/retry.js");
    const res: Response = await retry(async () => await fetchWithTimeout(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        timeoutMs: timeoutMs ?? 60000,
      }), retryCount ?? 3, 500);

    const response: JsonRpcResponse<R> = await res.json();
    if (response.error) {
      throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
    }

    if (!res.ok) {
      throw new Error(`Network error: ${res.status} ${res.statusText}`);
    }

    // response.result is guaranteed if no error
    return response.result as R;
  }
}
