import { Chain, defineChain, parseGwei, maxInt80, slice, rpcSchema, maxInt40, maxInt208, Abi, minInt88, toRlp } from "viem";
import { Network } from "../Models/Network";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";

const overrides = [
    maxInt80.toString()
]

export default function resolveChain(network: Network) {
    const aa = () => {
        console.log(slice)
        console.log(rpcSchema)
        console.log(maxInt40)
        console.log(maxInt208)
        console.log(maxInt80)
        console.log(minInt88)
        console.log(toRlp)
        let a: Abi | undefined
    }
    aa()
    const nativeCurrency = network.token;
    const blockExplorersBaseURL =
        network.transaction_explorer_template ?
            new URL(network.transaction_explorer_template).origin
            : null

    const metadata = network.metadata
    const { evm_multicall_contract } = metadata || {}

    if (!nativeCurrency) {
        SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        return
    }

    const res = defineChain({
        id: Number(network.chain_id),
        name: network.display_name,
        nativeCurrency: {
            name: nativeCurrency.symbol,
            symbol: nativeCurrency.symbol,
            decimals: nativeCurrency.decimals
        },
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
            ...(evm_multicall_contract ? {
                multicall3: {
                    address: evm_multicall_contract as `0x${string}`
                }
            } : {}),
        },
    })

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
    return res as Chain
}
