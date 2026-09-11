import assert from 'node:assert/strict'
import test from 'node:test'
import { getErrorOccurrenceId } from '@layerswap/widget-types'
import {
  lifecycleContextFromForm,
  lifecycleContextFromSwap,
  lifecycleErrorDetails,
  normalizeWalletErrorCode,
} from '../dist/esm/lib/swapLifecycle.js'

test('normalizes form data into stable lifecycle fields', () => {
  assert.deepEqual(lifecycleContextFromForm({
    amount: '1.25',
    depositMethod: 'wallet',
    destination_address: '0xdestination',
    from: { name: 'ARBITRUM_MAINNET' },
    to: { name: 'BASE_MAINNET' },
    fromAsset: { symbol: 'ETH' },
    toAsset: { symbol: 'USDC' },
  }), {
    depositMethod: 'wallet',
    requestedAmount: '1.25',
    toAddress: '0xdestination',
    sourceNetwork: 'ARBITRUM_MAINNET',
    destinationNetwork: 'BASE_MAINNET',
    sourceToken: 'ETH',
    destinationToken: 'USDC',
  })
})

test('normalizes an active swap without losing its correlation fields', () => {
  assert.deepEqual(lifecycleContextFromSwap({
    requested_amount: '2',
    use_deposit_address: false,
    destination_address: '0xdestination',
    source_network: { name: 'ARBITRUM_MAINNET' },
    destination_network: { name: 'BASE_MAINNET' },
    source_token: { symbol: 'ETH' },
    destination_token: { symbol: 'USDC' },
  }, {
    id: 'swap-123',
    source_address: '0xsource',
  }), {
    swapId: 'swap-123',
    depositMethod: 'wallet',
    requestedAmount: '2',
    fromAddress: '0xsource',
    toAddress: '0xdestination',
    sourceNetwork: 'ARBITRUM_MAINNET',
    destinationNetwork: 'BASE_MAINNET',
    sourceToken: 'ETH',
    destinationToken: 'USDC',
  })
})

test('prefers a stable API reason code and user-facing API message', () => {
  const error = Object.assign(new Error('Request failed'), {
    response: {
      data: {
        error: {
          code: 'ROUTE_UNAVAILABLE',
          message: 'This route is temporarily unavailable',
        },
      },
    },
  })

  assert.deepEqual(lifecycleErrorDetails(error), {
    occurrenceId: getErrorOccurrenceId(error),
    reasonCode: 'ROUTE_UNAVAILABLE',
    reason: 'This route is temporarily unavailable',
    errorCode: 'ROUTE_UNAVAILABLE',
  })
})

test('wallet failures get a bounded reason code and keep the raw provider code', () => {
  const cases = [
    [Object.assign(new Error('MetaMask Tx Signature: User denied transaction signature.'), { code: 4001 }), 'user_rejected', '4001'],
    [Object.assign(new Error('insufficient funds for gas * price + value'), { code: 'INSUFFICIENT_FUNDS' }), 'insufficient_funds', 'INSUFFICIENT_FUNDS'],
    [Object.assign(new Error('cannot estimate gas; transaction may fail'), { code: 'UNPREDICTABLE_GAS_LIMIT' }), 'gas_estimation_failed', 'UNPREDICTABLE_GAS_LIMIT'],
    [Object.assign(new Error('Unrecognized chain ID "0x1a4". Try adding the chain first.'), { code: 4902 }), 'chain_not_added', '4902'],
    [Object.assign(new Error('Internal JSON-RPC error.'), { code: -32603 }), 'internal_rpc_error', '-32603'],
    [Object.assign(new Error('The request took too long to respond.'), { name: 'TimeoutError' }), 'timeout', undefined],
    [Object.assign(new Error('Execution reverted for an unknown reason.'), { name: 'ContractFunctionExecutionError' }), 'contract_reverted', undefined],
    [new Error('something unexpected'), 'unknown_error', undefined],
  ]
  for (const [error, reasonCode, errorCode] of cases) {
    const details = lifecycleErrorDetails(error)
    assert.equal(details.reasonCode, reasonCode, error.message)
    assert.equal(details.errorCode, errorCode, error.message)
    assert.equal(details.reason, error.message)
  }
})

test('classification follows the cause chain and prefers structured codes over text', () => {
  const wrapped = new Error('Transaction failed', { cause: Object.assign(new Error('nonce too low'), { code: 'NONCE_EXPIRED' }) })
  assert.equal(normalizeWalletErrorCode(wrapped), 'nonce_or_replacement')
  // A rejection code wins even when the message mentions gas.
  assert.equal(normalizeWalletErrorCode(Object.assign(new Error('gas estimation failed'), { code: 4001 })), 'user_rejected')
  assert.equal(normalizeWalletErrorCode('Failed to fetch'), 'network_error')
  assert.equal(normalizeWalletErrorCode(undefined), 'unknown_error')
  // Very long provider codes stay bounded.
  assert.equal(lifecycleErrorDetails(Object.assign(new Error('x'), { code: 'A'.repeat(500) })).errorCode.length, 128)
})
