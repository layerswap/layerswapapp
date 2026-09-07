import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lifecycleContextFromForm,
  lifecycleContextFromSwap,
  lifecycleErrorDetails,
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
    reasonCode: 'ROUTE_UNAVAILABLE',
    reason: 'This route is temporarily unavailable',
  })
})
