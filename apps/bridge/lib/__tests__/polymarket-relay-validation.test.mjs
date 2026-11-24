import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const repository = new URL('../../../../', import.meta.url)
const require = createRequire(new URL('packages/wallets/adapters/evm/package.json', repository))
const viem = require('viem')

function loadSource(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, repository), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        if (name in imports) return imports[name]
        throw new Error(`Unexpected ${path} dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}

const polymarket = 'packages/wallets/adapters/evm/src/additionalProviders/polymarket/'
const protocol = loadSource(`${polymarket}protocol.ts`, {})
const constants = { ...protocol, POLYMARKET_CHAIN_ID: 137 }
const { buildPolymarketDepositCalls } = loadSource(`${polymarket}depositWithdraw.ts`, { viem, './constants': constants })
const { encodeSafeMultiSend } = loadSource(`${polymarket}safeWithdraw.ts`, { viem, './constants': constants })
const { validateRelaySubmitRequest } = loadSource('apps/bridge/lib/polymarket/validateRelaySubmit.ts', {
    viem,
    '@layerswap/wallet-evm/polymarket-protocol': protocol,
})

const owner = '0x1111111111111111111111111111111111111111'
const funder = '0x2222222222222222222222222222222222222222'
const recipient = '0x5da5c2a98e26fd28914b91212b1232d58eb9bbab'
const amount = 2_000_000n
const swapIdentifier = 'c8d430a1a75548f49ec3d99fa6ab58872a50760c10edb4270000000000003a26'
const transferCallData = viem.encodeFunctionData({ abi: viem.erc20Abi, functionName: 'transfer', args: [recipient, amount] }) + swapIdentifier

const calls = funderTokenAddress => buildPolymarketDepositCalls({ funderTokenAddress, funderAddress: funder, amountBaseUnits: amount, transferCallData })
const walletRequest = batch => ({
    type: 'WALLET', from: owner, to: protocol.POLYMARKET_DEPOSIT_WALLET_FACTORY, nonce: '0', signature: '0x',
    depositWalletParams: { depositWallet: funder, deadline: '0', calls: batch.map(c => ({ target: c.target, value: '0', data: c.data })) },
})
const safeRequest = batch => ({
    type: 'SAFE', from: owner, to: protocol.POLYMARKET_SAFE_MULTISEND, proxyWallet: funder, data: encodeSafeMultiSend(batch),
    signatureParams: { operation: '1', gasPrice: '0', safeTxnGas: '0', baseGas: '0', gasToken: viem.zeroAddress, refundReceiver: viem.zeroAddress },
})

test('pUSD batches end with the backend USDC.e transfer and pass relay validation', () => {
    const batch = calls(protocol.POLYMARKET_PUSD_ADDRESS)
    assert.equal(batch.length, 3)
    assert.equal(batch[2].target, protocol.POLYMARKET_USDC_E_ADDRESS)
    assert.equal(batch[2].data, transferCallData)
    assert.deepEqual(validateRelaySubmitRequest(walletRequest(batch)), { ok: true, kind: 'deposit' })
    assert.deepEqual(validateRelaySubmitRequest(safeRequest(batch)), { ok: true, kind: 'deposit' })
})

test('USDC.e batches are a single transfer and pass relay validation', () => {
    const batch = calls(protocol.POLYMARKET_USDC_E_ADDRESS)
    assert.deepEqual(batch, [{ target: protocol.POLYMARKET_USDC_E_ADDRESS, data: transferCallData }])
    assert.deepEqual(validateRelaySubmitRequest(walletRequest(batch)), { ok: true, kind: 'deposit' })
})

test('relay validation rejects transfers of other tokens or amounts', () => {
    const otherToken = [{ target: protocol.POLYMARKET_PUSD_ADDRESS, data: transferCallData }]
    assert.equal(validateRelaySubmitRequest(walletRequest(otherToken)).ok, false)

    const batch = calls(protocol.POLYMARKET_PUSD_ADDRESS)
    const larger = viem.encodeFunctionData({ abi: viem.erc20Abi, functionName: 'transfer', args: [recipient, amount + 1n] }) + swapIdentifier
    assert.equal(validateRelaySubmitRequest(walletRequest([batch[0], batch[1], { ...batch[2], data: larger }])).ok, false)

    const approve = viem.encodeFunctionData({ abi: viem.erc20Abi, functionName: 'approve', args: [recipient, amount] }) + swapIdentifier
    assert.equal(validateRelaySubmitRequest(walletRequest([{ target: protocol.POLYMARKET_USDC_E_ADDRESS, data: approve }])).ok, false)
})
