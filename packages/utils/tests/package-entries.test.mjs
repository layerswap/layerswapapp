import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

// The published files target bundlers, which resolve extensionless ESM imports.
const extensions = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            for (const suffix of ['.js', '.jsx', '/index.js']) {
                const url = new URL(`${specifier}${suffix}`, context.parentURL)
                if (existsSync(url)) return nextResolve(url.href, context)
            }
        }
        return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
        if (url.includes('/dist/esm/') && url.endsWith('.jsx')) {
            return { source: readFileSync(new URL(url), 'utf8'), format: 'module', shortCircuit: true }
        }
        return nextLoad(url, context)
    },
})
after(() => extensions.deregister())

test('the utility root loads and runs without the optional React dependency', async () => {
    const withoutReact = registerHooks({ resolve(specifier, context, nextResolve) {
        if (specifier === 'react' || specifier.startsWith('react/')) {
            throw new Error('React is not installed in this utility consumer')
        }
        return nextResolve(specifier, context)
    } })
    try {
        const { getExplorerUrl, shortenString, cn } = await import('@layerswap/utils')
        assert.equal(getExplorerUrl('https://example.com/{0}', 'abc'), 'https://example.com/abc')
        assert.equal(shortenString('0123456789abcdef'), '01234...cdef')
        assert.equal(cn('px-2', 'px-4'), 'px-4')
    } finally {
        withoutReact.deregister()
    }
})

test('the React entry point exports the shared hooks', async () => {
    const { useCopyClipboard, useWindowDimensions } = await import('@layerswap/utils/react')
    assert.equal(typeof useCopyClipboard, 'function')
    assert.equal(typeof useWindowDimensions, 'function')
})

test('custom Stellar networks validate and normalize addresses through their adapter', async () => {
    const { AddressUtilsResolver, StellarAddressUtilsProvider } = await import('@layerswap/utils')
    const resolver = new AddressUtilsResolver([new StellarAddressUtilsProvider()])
    resolver.setNetworkAdapter({ isStellarNetwork: network => network.family === 'stellar' })
    const network = { name: 'custom-stellar', family: 'stellar' }
    const address = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

    assert.equal(resolver.isValidAddress({ network, address }), true)
    assert.equal(resolver.addressFormat({ network, address: ` ${address.toLowerCase()} ` }), address)
    assert.equal(resolver.isValidAddress({ network, address: `${address.slice(0, -1)}G` }), false)
    assert.equal(resolver.isValidAddress({ network: { name: 'another-family', family: 'evm' }, address }), false)
    assert.equal(resolver.isValidAddress({ network: { name: 'STELLAR_MAINNET' }, address }), true)
})
