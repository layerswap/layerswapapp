import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { InternalRpcError, InvalidInputRpcError } from 'viem'
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { isUserRejection } from '../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection.js'

// The widget emits extensionless relative imports for bundlers; resolve those in Node.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())
const { lifecycleErrorDetails } = await import('../dist/esm/lib/swapLifecycle.js')

// The Hyperliquid/Polymarket sign steps, wallet connection, onTransferError and
// every lifecycle reasonCode see the raw viem error, not a re-wrapped one.
test('a viem-wrapped -32603 decline is a rejection for execution and for the lifecycle reason code', () => {
  const shapes = [
    new InternalRpcError(Object.assign(new Error('User rejected the request.'), { code: -32603 })),
    new InternalRpcError(Object.assign(new Error('Internal JSON-RPC error.'), { code: -32603, data: { code: 4001 } })),
    new InternalRpcError(Object.assign(new Error('Internal JSON-RPC error.'), { code: -32603, data: { cause: { message: 'User rejected the request.' } } })),
  ]
  for (const error of shapes) {
    assert.equal(error.name, 'InternalRpcError')
    assert.equal(isUserRejection(error), true)
    const details = lifecycleErrorDetails(error)
    assert.equal(details.reasonCode, 'user_rejected')
    assert.equal(details.errorCode, '-32603')
  }
  const bare = new InternalRpcError(Object.assign(new Error('Internal JSON-RPC error.'), { code: -32603 }))
  assert.equal(isUserRejection(bare), false)
  assert.equal(lifecycleErrorDetails(bare).reasonCode, 'internal_rpc_error')
})

test('viem InvalidInputRpcError over ambiguous -32000 keeps the underlying reason and raw code', () => {
  const cases = [
    ['nonce too low', 'nonce_or_replacement'],
    ['execution reverted', 'contract_reverted'],
    ['insufficient funds for gas * price + value', 'insufficient_funds'],
    ['invalid sender', 'unknown_error'],
  ]
  for (const code of [-32000, '-32000']) {
    for (const [message, reasonCode] of cases) {
      const error = new InvalidInputRpcError(Object.assign(new Error(message), { code }))
      assert.equal(error.name, 'InvalidInputRpcError')
      assert.equal(normalizeWalletErrorCode(error), reasonCode, message)
      const details = lifecycleErrorDetails(error)
      assert.equal(details.reasonCode, reasonCode, message)
      assert.equal(details.errorCode, '-32000', message)
    }
  }
})
