import { Layer } from "../Models/Layer";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";

export default function resolveChain(network: Layer): (Chain & RainbowKitChain) | undefined {

    const nativeCurrency = network.tokens.find(c => c.is_native);
    const blockExplorersBaseURL =
        network.transaction_explorer_template ?
            new URL(network.transaction_explorer_template).origin
            : null

    const metadata = network.metadata
    const { evm_multi_call_contract } = metadata || {}

    if (!nativeCurrency) {
        if (process.env.NEXT_PUBLIC_API_VERSION !== 'sandbox')
            SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        return
    }

    const res: Chain & RainbowKitChain = {
        id: Number(network.chain_id),
        name: network.display_name,
        network: network.name,
        nativeCurrency: {
            name: nativeCurrency.symbol,
            symbol: nativeCurrency.symbol,
            decimals: nativeCurrency.decimals
        },
        iconUrl: network.logo,
        rpcUrls: {
            default: {
                http: [network.node_url],
            },
            public: {
                http: [network.node_url],
            },
        },
        ...(blockExplorersBaseURL ? {
            blockExplorers: {
                default: {
                    name: 'name',
                    url: blockExplorersBaseURL,
                },
            }
        } : {}),
        contracts: {
            ...(evm_multi_call_contract ? {
                multicall3: {
                    address: evm_multi_call_contract
                }
            } : {}),
        },
    }

    const defaultPriorityFee = NetworkSettings.KnownSettings[network.name]?.DefaultPriorityFee?.toString()
    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.name]?.BaseFeeMultiplier ?? 1.2

    if (defaultPriorityFee) {
        res.fees = {
            ...res.fees,
            defaultPriorityFee: () => parseGwei(defaultPriorityFee),
        }
    }
    if (baseFeeMultiplier) {
        res.fees = {
            ...res.fees,
            baseFeeMultiplier: () => baseFeeMultiplier
        }
    }
    return res
}

type Chain<
    formatters extends ChainFormatters | undefined = ChainFormatters | undefined,
> = ChainConstants & ChainConfig<formatters>

type RainbowKitChain = {
    id: number;
    name?: string;
    iconUrl?: string | (() => Promise<string>) | null;
    iconBackground?: string;
} & Chain

/**
 * Multiplies a string representation of a number by a given exponent of base 10 (10exponent).
 *
 * - Docs: https://viem.sh/docs/utilities/parseUnits.html
 *
 * @example
 * import { parseUnits } from 'viem'
 *
 * parseUnits('420', 9)
 * // 420000000000n
 */
export function parseUnits(value: string, decimals: number) {
    let [integer, fraction = '0'] = value.split('.')

    const negative = integer.startsWith('-')
    if (negative) integer = integer.slice(1)

    // trim leading zeros.
    fraction = fraction.replace(/(0+)$/, '')

    // round off if the fraction is larger than the number of decimals.
    if (decimals === 0) {
        if (Math.round(Number(`.${fraction}`)) === 1)
            integer = `${BigInt(integer) + 1n}`
        fraction = ''
    } else if (fraction.length > decimals) {
        const [left, unit, right] = [
            fraction.slice(0, decimals - 1),
            fraction.slice(decimals - 1, decimals),
            fraction.slice(decimals),
        ]

        const rounded = Math.round(Number(`${unit}.${right}`))
        if (rounded > 9)
            fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, '0')
        else fraction = `${left}${rounded}`

        if (fraction.length > decimals) {
            fraction = fraction.slice(1)
            integer = `${BigInt(integer) + 1n}`
        }

        fraction = fraction.slice(0, decimals)
    } else {
        fraction = fraction.padEnd(decimals, '0')
    }

    return BigInt(`${negative ? '-' : ''}${integer}${fraction}`)
}

function parseGwei(ether: string, unit: 'wei' = 'wei') {
    return parseUnits(ether, gweiUnits[unit])
}

const gweiUnits = {
    ether: -9,
    wei: 9,
}


export type ChainBlockExplorer = {
    name: string
    url: string
}

export type ChainConstants = {
    /** Collection of block explorers */
    blockExplorers?: {
        default: ChainBlockExplorer
        etherscan?: ChainBlockExplorer
    }
    /** Collection of contracts */
    contracts?: {
        [key: string]: ChainContract | { [chainId: number]: ChainContract }
    } & {
        ensRegistry?: ChainContract
        ensUniversalResolver?: ChainContract
        multicall3?: ChainContract
    }
    /** ID in number form */
    id: number
    /** Human-readable name */
    name: string
    /**
     * Internal network name
     * @deprecated will be removed in v2 - use `id` instead.
     */
    network: string
    /** Currency used by chain */
    nativeCurrency: ChainNativeCurrency
    /** Collection of RPC endpoints */
    rpcUrls: {
        [key: string]: ChainRpcUrls
        default: ChainRpcUrls
        public: ChainRpcUrls
    }
    /** Source Chain ID (ie. the L1 chain) */
    sourceId?: number
    /** Flag for test networks */
    testnet?: boolean

    // TODO(v2): remove `rpcUrls` in favor of `publicRpcUrls`.
    // publicRpcUrls: ChainRpcUrls,
}

export type ChainContract = {
    address: `0x${string}`
    blockCreated?: number
}

export type ChainNativeCurrency = {
    name: string
    /** 2-6 characters long */
    symbol: string
    decimals: number
}

export type ChainRpcUrls = {
    http: readonly string[]
    webSocket?: readonly string[]
}



export type ChainConfig<
    formatters extends ChainFormatters | undefined = ChainFormatters | undefined,
> = {
    /**
     * Modifies how chain data structures (ie. Blocks, Transactions, etc)
     * are formatted & typed.
     */
    formatters?: formatters | undefined
    /** Modifies how data (ie. Transactions) is serialized. */
    serializers?: ChainSerializers<formatters> | undefined
    /** Modifies how fees are derived. */
    fees?: ChainFees<formatters> | undefined
}

export type ChainFees<
    formatters extends ChainFormatters | undefined = ChainFormatters | undefined,
> = {
        /**
         * The fee multiplier to use to account for fee fluctuations.
         * Used in the [`estimateFeesPerGas` Action](/docs/actions/public/estimateFeesPerGas).
         *
         * @default 1.2
         */
    }

export type ChainFormatters = {
    /** Modifies how the Block structure is formatted & typed. */
    block?: ChainFormatter<'block'>
    /** Modifies how the Transaction structure is formatted & typed. */
    transaction?: ChainFormatter<'transaction'>
    /** Modifies how the TransactionReceipt structure is formatted & typed. */
    transactionReceipt?: ChainFormatter<'transactionReceipt'>
    /** Modifies how the TransactionRequest structure is formatted & typed. */
    transactionRequest?: ChainFormatter<'transactionRequest'>
}

export type ChainFormatter<type extends string = string> = {
    format: (args: any) => any
    type: type
}

export type ChainSerializers<
    formatters extends ChainFormatters | undefined = undefined,
> = {
        /** Modifies how Transactions are serialized. */
    }


/////////////////////////////////////////////////////////////////////
// Utils

export type ExtractChain<
    chains extends readonly Chain[],
    chainId extends Chain['id'],
> = Extract<chains[number], { id: chainId }>

export type ExtractChainFormatterExclude<
    chain extends { formatters?: Chain['formatters'] } | undefined,
    type extends keyof ChainFormatters,
> = chain extends { formatters?: infer _Formatters extends ChainFormatters }
    ? _Formatters[type] extends { exclude: infer Exclude }
    ? Extract<Exclude, string[]>[number]
    : ''
    : ''

export type ExtractChainFormatterParameters<
    chain extends { formatters?: Chain['formatters'] } | undefined,
    type extends keyof ChainFormatters,
    fallback,
> = chain extends { formatters?: infer _Formatters extends ChainFormatters }
    ? _Formatters[type] extends ChainFormatter
    ? Parameters<_Formatters[type]['format']>[0]
    : fallback
    : fallback

export type ExtractChainFormatterReturnType<
    chain extends { formatters?: Chain['formatters'] } | undefined,
    type extends keyof ChainFormatters,
    fallback,
> = chain extends { formatters?: infer _Formatters extends ChainFormatters }
    ? _Formatters[type] extends ChainFormatter
    ? ReturnType<_Formatters[type]['format']>
    : fallback
    : fallback

export type GetChain<
    chain extends Chain | undefined,
    chainOverride extends Chain | undefined = undefined,
> = IsUndefined<chain> extends true
    ? { chain: chainOverride | null }
    : { chain?: chainOverride | null }
type IsUndefined<T> = [undefined] extends [T] ? true : false