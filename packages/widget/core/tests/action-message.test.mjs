import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const moduleUrl = source => 'data:text/javascript,' + encodeURIComponent(source)
const fixtures = moduleUrl(`
  export const useSwapDataState = () => ({})
  export const ErrorHandler = () => {}
  export class Address { toShortString() { return 'G…SOURCE' } }
`)
// Keep the real message selection and copy; replace only the visual wrapper.
const messageWrapper = moduleUrl(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  export default ({ header, details }) => createElement('section', null,
    createElement('h2', null, header), createElement('p', null, details))
  export const WalletUnknownError = () => createElement('section', null, 'Wallet error')
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (['/context/swap', '/lib/ErrorHandler', '/lib/address/Address'].some(path => specifier.endsWith(path))) {
    return { url: fixtures, shortCircuit: true }
  }
  if ((specifier === './Message' && context.parentURL?.endsWith('/messages/TransactionMessages.js')) ||
      (specifier === '../messages/Message' && context.parentURL?.endsWith('/Presentation/ActionMessageView.js'))) {
    return { url: messageWrapper, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })
after(() => hooks.deregister())
const { ActionMessage } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/actionMessage.js')
const { ActionMessageView } = await import('../dist/esm/components/Pages/Swap/Withdraw/Presentation/ActionMessageView.js')

const renderError = (error, overrides = {}) => renderToStaticMarkup(createElement(ActionMessageView, {
  error, sourceNetwork: { display_name: 'Optimism', type: 'evm' },
  selectedSourceAddress: 'source', swapError: true, ...overrides,
}))

test('a nested wallet RPC failure shows network recovery instead of the generic swap error', () => {
  const error = Object.assign(new Error('An unknown RPC error occurred.', {
    cause: { name: 'UnknownRpcError', code: -1, cause: {
      code: -32080, message: 'RPC 0xa Custom eth_getBlockByNumber: RPC endpoint returned HTTP client error.',
    } },
  }), { name: 'UnexpectedErrorMessage' })
  const html = renderError(error)
  assert.match(html, /Network connection failed/)
  assert.match(html, /RPC URL/)
  assert.match(html, /Optimism network settings/)
  assert.match(html, /try again/)
  assert.doesNotMatch(html, /Something went wrong|rejected|eth_getBlockByNumber|-32080|assets were not moved/)
  const otherNetwork = renderError(error, { sourceNetwork: { display_name: 'Stellar', type: 'stellar' } })
  assert.match(otherNetwork, /Stellar/)
  assert.doesNotMatch(otherNetwork, /RPC URL|Optimism/)
})

test('recognized wallet failures give specific recovery guidance', () => {
  for (const [error, header, guidance] of [
    [{ code: -32603 }, /Wallet request failed/, /Check your wallet for details/],
    [{ code: 4900 }, /Wallet disconnected/, /reconnect/],
    [{ code: -32002 }, /Request already pending/, /complete or reject/],
    [new Error('Request timed out'), /Wallet response timed out/, /submitted transaction before trying again/],
  ]) {
    const html = renderError(error)
    assert.match(html, header)
    assert.match(html, guidance)
    assert.doesNotMatch(html, /Something went wrong|assets were not moved/)
  }
})

test('wallet recovery preserves rejection, loading, gasless and unknown-error precedence', () => {
  assert.match(renderError({ code: 4001 }), /Transaction rejected/)
  assert.match(renderError({ code: 4001 }, { isSignatureError: true }), /Signing rejected/)
  assert.match(renderError({ code: 'NETWORK_ERROR' }, { isLoading: true }), /Confirm in wallet/)
  assert.match(renderError({ code: 'NETWORK_ERROR' }, { gaslessUnavailable: true }), /Gasless transfer unavailable/)
  assert.match(renderError(new Error('Unknown problem')), /Something went wrong/)
  assert.match(renderError(new Error('Unknown problem'), { swapError: false }), /Wallet error/)
})

for (const [name, expectedHeader] of [
  ['TransactionRejected', 'Transaction rejected'],
  ['InsufficientFunds', 'Insufficient funds'],
  ['TransactionFailed', 'Transaction failed'],
  ['TransactionExpired', 'Transfer details expired'],
  ['WaletMismatch', 'Account mismatch'],
  ['DifferentAccountsNotAllowedError', 'Action needed'],
  ['UnexpectedErrorMessage', 'Wallet error'],
]) {
  test(`the existing ${name} UI message is preserved`, () => {
    const error = Object.assign(new Error('Stellar'), { name })
    const html = renderToStaticMarkup(createElement(ActionMessage, {
      error, isLoading: false, selectedSourceAddress: 'source', sourceNetwork: { name: 'STELLAR_MAINNET' },
    }))
    assert.ok(html.includes(expectedHeader), html)
    if (name === 'TransactionRejected') {
      assert.match(html, /rejected the transaction in your wallet/)
      assert.match(html, /Try again/)
      assert.doesNotMatch(html, /Wallet error/)
    }
  })
}
