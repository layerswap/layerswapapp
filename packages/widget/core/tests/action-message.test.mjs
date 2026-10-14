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
  if (specifier === './Message' && context.parentURL?.endsWith('/messages/TransactionMessages.js')) {
    return { url: messageWrapper, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
} })
after(() => hooks.deregister())
const { ActionMessage } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/actionMessage.js')

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
