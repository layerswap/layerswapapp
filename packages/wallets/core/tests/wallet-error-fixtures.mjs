// Provenance-tagged corpus for @layerswap/wallet-core/errors.
//
// Rule: a misclassification found in review or in Faro is fixed by adding a
// fixture with its source, never by a call-site special case; shapes from
// memory are not added. `source` is mandatory:
//   'spec'                                                  JSON-RPC 2.0 / EIP-1193 / CAIP-25 defined codes
//   'sdk:viem'                                              viem utils/buildRequest.js code mapping
//   'sdk:@metamask/rpc-errors@6.4.0 utils.mjs:80-90'        serializer fallback: -32603 with the original under data.cause
//   'sdk:@ledgerhq/errors src/index.ts:340'                 'Condition of use not satisfied (denied by the user?)'
//   'sdk:ethers@5 json-rpc-provider.js:487'                 SERVER_ERROR with the JSON-RPC body under `.error`
//   'review:PR#2166'                                        shapes observed while reviewing the Faro migration

export const FIXTURES = [
    // --- declines that hide behind the -32603 / SERVER_ERROR buckets
    { label: '-32603 with a rejection message', source: 'review:PR#2166', error: { code: -32603, message: 'User rejected the request.' }, expected: 'user_rejected' },
    { label: '-32603 with data.code 4001', source: 'review:PR#2166', error: { code: -32603, message: 'Internal JSON-RPC error.', data: { code: 4001 } }, expected: 'user_rejected' },
    { label: '-32603 with data.originalError.code 4001', source: 'review:PR#2166', error: { code: -32603, message: 'Internal JSON-RPC error.', data: { originalError: { code: 4001 } } }, expected: 'user_rejected' },
    { label: '-32603 with data.message rejection', source: 'review:PR#2166', error: { code: -32603, message: 'Internal JSON-RPC error.', data: { message: 'User rejected the request.' } }, expected: 'user_rejected' },
    { label: 'rpc-errors serializer fallback around a rejection', source: 'sdk:@metamask/rpc-errors@6.4.0 utils.mjs:80-90', error: { code: -32603, message: 'Internal JSON-RPC error.', data: { cause: { message: 'User rejected the request.', stack: 'Error: User rejected the request.\n    at <anonymous>' } } }, expected: 'user_rejected' },
    { label: 'Ledger decline relayed as -32603', source: 'sdk:@ledgerhq/errors src/index.ts:340', error: { code: -32603, message: 'Ledger: Condition of use not satisfied (denied by the user?)' }, expected: 'user_rejected' },
    { label: 'ethers v5 SERVER_ERROR around 4001', source: 'sdk:ethers@5 json-rpc-provider.js:487', error: { code: 'SERVER_ERROR', message: 'processing response error', error: { code: 4001 } }, expected: 'user_rejected' },
    { label: 'CAIP-25 user rejected', source: 'spec', error: { code: 5000, message: 'User rejected.' }, expected: 'user_rejected' },
    // --- other reasons nested under the bucket
    { label: '-32603 with data.message insufficient funds', source: 'review:PR#2166', error: { code: -32603, message: 'Internal JSON-RPC error.', data: { message: 'insufficient funds for gas * price + value' } }, expected: 'insufficient_funds' },
    { label: 'TimeoutError name carrying -32603', source: 'review:PR#2166', error: { name: 'TimeoutError', code: -32603 }, expected: 'timeout' },
    // --- negatives: the bucket stays a bucket when nothing better exists
    { label: 'bare -32603', source: 'spec', error: { code: -32603, message: 'Internal JSON-RPC error.' }, expected: 'internal_rpc_error' },
    { label: '-32603 over viem unknown -1', source: 'sdk:viem', error: { code: -32603, cause: { code: -1 } }, expected: 'internal_rpc_error' },
    { label: '-32603 with an array under data', source: 'review:PR#2166', error: { code: -32603, data: [{ code: 4001 }] }, expected: 'internal_rpc_error' },
    { label: '-32603 with hex revert data', source: 'review:PR#2166', error: { code: -32603, data: '0xdeadbeef' }, expected: 'internal_rpc_error' },
    { label: 'ethers v5 SERVER_ERROR without a body', source: 'sdk:ethers@5 json-rpc-provider.js:487', error: { code: 'SERVER_ERROR', message: 'bad response' }, expected: 'network_error' },
    { label: 'node TransactionRejectedRpcError is not a decline', source: 'sdk:viem', error: { code: -32003, name: 'TransactionRejectedRpcError', message: 'Transaction rejected' }, expected: 'unknown_error' },
    { label: 'EIP-1193 unauthorized', source: 'spec', error: { code: 4100 }, expected: 'unauthorized' },
    { label: 'node -32000 without a known phrase', source: 'review:PR#2166', error: { code: -32000, message: 'invalid sender' }, expected: 'unknown_error' },
]

// Wrappers that SDKs and wallets put around the real failure. Wrapping any
// fixture in any of these (once or twice) must not change its classification.
export const GENERIC_WRAPPERS = [
    inner => ({ code: -32603, cause: inner }),
    inner => ({ code: -32603, message: 'Internal JSON-RPC error.', data: { cause: inner } }),
    inner => ({ code: -32603, data: { originalError: inner } }),
    inner => ({ code: 'SERVER_ERROR', error: inner }),
    inner => new Error('wrapper', { cause: inner }),
    inner => ({ name: 'InternalRpcError', code: -32603, shortMessage: 'An internal error was received.', message: 'An internal error was received.\n\nDetails: ' + (inner.message ?? ''), cause: inner }),
    inner => ({ name: 'InvalidInputRpcError', code: -32000, shortMessage: 'Missing or invalid parameters.', message: 'Missing or invalid parameters.\n\nDetails: ' + (inner.message ?? ''), cause: inner }),
]
