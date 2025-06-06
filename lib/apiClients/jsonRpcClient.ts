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

  async call<P, R>(method: string, params: P): Promise<R> {
    const request: JsonRpcRequest<P> = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.nextId++,
    };

    const res: Response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

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
