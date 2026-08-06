import assert from 'node:assert/strict'
import test from 'node:test'

import {
    isWalletConnectRegistryConnector,
} from '../dist/esm/lib/walletConnect/connectorSource.js'
import {
    createRegistryConnector,
} from '../dist/esm/lib/walletConnect/createRegistryConnector.js'
import {
    getProvidersForWalletConnectNetworkType,
} from '../dist/esm/lib/walletConnect/providerCapabilities.js'
import {
    resolveChainConnectors,
} from '../dist/esm/hooks/useConnectors.js'

const registryWallet = {
    walletConnectProjectId: 'test-project',
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://example.com/rainbow.png',
    mobile: {
        native: 'rainbow://',
        universal: 'https://rnbwapp.com',
    },
    chains: ['eip155:1', 'solana:mainnet'],
    hasBrowserExtension: true,
    installUrl: 'https://rainbow.me',
    isMobileSupported: true,
    order: 1,
}

test('configured WalletConnect metadata does not imply registry source', () => {
    const configuredConnector = {
        id: 'rainbow',
        name: 'Rainbow',
        providerName: 'EVM',
        type: 'walletConnect',
        source: 'configured',
        mobile: {
            native: 'rainbow://',
            universal: 'https://rnbwapp.com',
        },
    }

    assert.equal(isWalletConnectRegistryConnector(configuredConnector), false)
})

test('registry connector source is explicit', () => {
    const registryConnector = createRegistryConnector(registryWallet, false, 'EVM')

    assert.equal(isWalletConnectRegistryConnector(registryConnector), true)
    assert.equal(registryConnector.source, 'registry')
    assert.equal(isWalletConnectRegistryConnector({
        ...registryConnector,
        type: 'injected',
    }), false)
})

test('connector composition preserves configured transport and synthesizes registry variants', () => {
    const configuredConnector = {
        id: 'rainbow-configured',
        name: 'Rainbow',
        providerName: 'EVM',
        type: 'walletConnect',
        source: 'configured',
        networkTypes: ['evm'],
        mobile: registryWallet.mobile,
    }
    const registryConnector = createRegistryConnector(registryWallet, false, 'EVM')
    const providers = [
        {
            id: 'evm-provider',
            name: 'EVM',
            capabilities: {
                walletConnectRegistry: {
                    networkTypes: ['evm'],
                },
            },
        },
        {
            id: 'solana-provider',
            name: 'Solana',
            capabilities: {
                walletConnectRegistry: {
                    networkTypes: ['solana'],
                },
            },
        },
    ]

    const variants = resolveChainConnectors(
        [configuredConnector, registryConnector],
        providers,
    ).get('rainbow')

    assert.equal(variants?.length, 2)
    assert.equal(variants?.[0], configuredConnector)
    assert.equal(variants?.[0]?.source, 'configured')
    assert.equal(variants?.[1]?.providerName, 'Solana')
    assert.equal(variants?.[1]?.source, 'registry')
    assert.equal(variants?.[1]?.type, 'walletConnect')
    assert.equal(variants?.[1]?.isLoadable, false)
})

test('provider capability matching does not depend on provider id', () => {
    const providers = [
        {
            id: 'custom-multichain-provider',
            name: 'Custom Multichain',
            capabilities: {
                walletConnectRegistry: {
                    networkTypes: ['evm', 'solana'],
                },
            },
        },
        {
            id: 'evm',
            name: 'Legacy ID Only',
        },
        {
            id: 'solana',
            name: 'Solana',
            capabilities: {
                walletConnectRegistry: {
                    networkTypes: ['solana'],
                },
            },
        },
    ]

    assert.deepEqual(
        getProvidersForWalletConnectNetworkType(providers, 'evm').map(provider => provider.name),
        ['Custom Multichain'],
    )
    assert.deepEqual(
        getProvidersForWalletConnectNetworkType(providers, 'solana').map(provider => provider.name),
        ['Custom Multichain', 'Solana'],
    )
})
