import { loadSource, amountPresets } from './source.mjs'

// Exercise the real preparation and calculator with deterministic service reads.
export function createPresetPreparation({
  token,
  balance = 1,
  gas = 0.1,
  maxFee,
  reserve,
  limits = { min_amount: 0.001, max_amount: 2 },
}) {
  const calls = []
  const { startPresetPreparation } = loadSource('lib/preparePresetAmount.ts', {
    '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
    '@layerswap/widget-types': { requiredDepositMethod: () => 'deposit_address' },
    '@/hooks/useFee': {
      buildLimitsUrl: args => {
        calls.push(['limits', args])
        return 'limits'
      },
    },
    './apiClients/layerSwapApiClient': {
      default: class {
        async fetcher() {
          return { data: limits }
        }
      },
    },
    './extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
    './extendedRoutes/transforms': {},
    '@/stores/balanceStore': {
      useBalanceStore: {
        getState: () => ({
          fetchBalance: async (address, chain, options) => {
            calls.push(['balance', address, chain.name, options])
            return { balances: [{ network: chain.name, token: token.symbol, amount: balance }] }
          },
        }),
      },
    },
    './resolvers/resolverService': {
      resolverService: {
        getGasResolver: () => ({
          getGas: async args => {
            calls.push(['gas', args])
            return { gas, maxFee, reserve, token }
          },
        }),
      },
    },
    './amountPresets': amountPresets,
  })

  async function preparePresetAmount(...args) {
    const preparation = await startPresetPreparation(...args)
    return preparation.calculate()
  }

  return { startPresetPreparation, preparePresetAmount, calls }
}
