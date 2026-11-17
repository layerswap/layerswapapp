type QueryParams = Record<string, string | string[] | undefined>
type MonitorCurrency = { network: string, asset: string }

// BestChange codes (bestchange.com/wiki/rates.html) for assets we route
const MONITOR_CURRENCIES: Record<string, MonitorCurrency> = {
    BTC: { network: 'BITCOIN_MAINNET', asset: 'BTC' },
    ETH: { network: 'ETHEREUM_MAINNET', asset: 'ETH' },
    USDTERC20: { network: 'ETHEREUM_MAINNET', asset: 'USDT' },
    USDCERC20: { network: 'ETHEREUM_MAINNET', asset: 'USDC' },
    ETHARBTM: { network: 'ARBITRUM_MAINNET', asset: 'ETH' },
    USDCARBTM: { network: 'ARBITRUM_MAINNET', asset: 'USDC' },
    ETHOPTM: { network: 'OPTIMISM_MAINNET', asset: 'ETH' },
    USDTOPTM: { network: 'OPTIMISM_MAINNET', asset: 'USDT' },
    USDCOPTM: { network: 'OPTIMISM_MAINNET', asset: 'USDC' },
    USDCBASE: { network: 'BASE_MAINNET', asset: 'USDC' },
    BNBBEP20: { network: 'BSC_MAINNET', asset: 'BNB' },
    ETHBEP20: { network: 'BSC_MAINNET', asset: 'ETH' },
    USDTBEP20: { network: 'BSC_MAINNET', asset: 'USDT' },
    USDCBEP20: { network: 'BSC_MAINNET', asset: 'USDC' },
    POL: { network: 'POLYGON_MAINNET', asset: 'POL' },
    USDCPOLYGON: { network: 'POLYGON_MAINNET', asset: 'USDC' },
    AVAX: { network: 'AVAX_MAINNET', asset: 'AVAX' },
    USDTAVAXC: { network: 'AVAX_MAINNET', asset: 'USDT' },
    USDCAVAXC: { network: 'AVAX_MAINNET', asset: 'USDC' },
    SOL: { network: 'SOLANA_MAINNET', asset: 'SOL' },
    USDTSOL: { network: 'SOLANA_MAINNET', asset: 'USDT' },
    USDCSOL: { network: 'SOLANA_MAINNET', asset: 'USDC' },
    TRX: { network: 'TRON_MAINNET', asset: 'TRX' },
    USDTTRC20: { network: 'TRON_MAINNET', asset: 'USDT' },
    GRAM: { network: 'TON_MAINNET', asset: 'TON' },
    USDTTON: { network: 'TON_MAINNET', asset: 'USDT' },
}

const MONITOR_KEYS = ['cur_from', 'cur_to', 'amt_from', 'amt_to']
const POSITIVE_DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

export function resolveMonitorCurrency(code: string | string[] | undefined): MonitorCurrency | undefined {
    const key = first(code)?.trim().toUpperCase()
    return key ? MONITOR_CURRENCIES[key] : undefined
}

function positiveAmount(value: string | string[] | undefined): string | undefined {
    const amount = first(value)?.trim()
    return amount && POSITIVE_DECIMAL.test(amount) && Number(amount) > 0 ? amount : undefined
}

export function resolveMonitorRedirect(query: QueryParams, pathname: string): string | null {
    const source = resolveMonitorCurrency(query.cur_from)
    const destination = resolveMonitorCurrency(query.cur_to)
    if (!source && !destination) return null

    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        if (MONITOR_KEYS.includes(key)) continue
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item !== undefined) params.append(key, item)
        }
    }

    if (source && !query.from && !query.fromAsset) {
        params.set('from', source.network)
        params.set('fromAsset', source.asset)
    }
    if (destination && !query.to && !query.toAsset) {
        params.set('to', destination.network)
        params.set('toAsset', destination.asset)
    }
    const amount = positiveAmount(query.amt_from)
    if (amount && !query.amount) params.set('amount', amount)
    if (source && !query.depositMethod) params.set('depositMethod', 'deposit_address')

    return `${pathname}?${params.toString()}`
}
