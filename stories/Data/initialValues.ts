import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { NetworkType } from "../../Models/Network";
import { SwapFormValues } from "../../components/DTOs/SwapFormValues";

export const initialValues: SwapFormValues = {
    "amount": "0.001803",
    "destination_address": "0xf51c208e2c37a99b13dcf01a3434cc71be8b2bdd",
    "from": {
        "tokens": [
            {
                "symbol": "USDC.e",
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.e.png",
                "contract": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6,
                display_asset: ""
            },
            {
                "symbol": "USDC",
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
                "contract": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6,
                display_asset: ""
            },
            {
                "symbol": "ETH",
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 3234.87,
                "precision": 6,
                display_asset: ""
            }
        ],
        "name": "ARBITRUM_MAINNET",
        "display_name": "Arbitrum One",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/arbitrum_mainnet.png",
        "chain_id": "42161",
        "node_url": "https://arbitrum-one.public.blastapi.io",
        "nodes": ["https://arbitrum-one.public.blastapi.io"],
        "type": NetworkType.EVM,
        "transaction_explorer_template": "https://arbiscan.io/tx/{0}",
        "account_explorer_template": "https://arbiscan.io/address/{0}",
        "token": {
            "symbol": "ETH",
            "listing_date": "2023-12-27T16:46:50.617075+00:00",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
            "contract": null,
            "decimals": 18,
            "price_in_usd": 0,
            "precision": 6,
            "display_asset": ""
        },
        "metadata": {
            "listing_date": "2023-12-27T16:46:50.617075+00:00"
        },
        "deposit_methods": [
            "deposit_address",
            "wallet"
        ]
    },
    "fromAsset": {
        "symbol": "ETH",
        "listing_date": "2023-12-27T16:46:50.617075+00:00",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
        "contract": null,
        "decimals": 18,
        "price_in_usd": 3234.87,
        "precision": 6,
        "display_asset": ""
    },
    fromExchange: undefined,
    to: {
        "tokens": [
            {
                "status": "active",
                "symbol": "USDC",
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
                "contract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6,
                display_asset: ""
            },
            {
                "status": "active",
                "symbol": "ETH",
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 3234.87,
                "precision": 6,
                display_asset: ""
            }
        ],
        "name": "ETHEREUM_MAINNET",
        "display_name": "Ethereum",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
        "chain_id": "1",
        "node_url": 'null',
        "nodes": [],
        "type": NetworkType.EVM,
        "transaction_explorer_template": "https://etherscan.io/tx/{0}",
        "account_explorer_template": "https://etherscan.io/address/{0}",
        "token": {
            "symbol": "ETH",
            "listing_date": "2023-12-27T16:46:50.617075+00:00",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
            "contract": null,
            "decimals": 18,
            "price_in_usd": 3234.87,
            "precision": 6,
            "display_asset": ""

        },
        "metadata": {
            "listing_date": "2023-12-27T16:46:50.617075+00:00"
        },
        "deposit_methods": [
            "deposit_address",
            "wallet"
        ]
    },
    "toAsset": {
        "status": "active",
        "symbol": "ETH",
        "listing_date": "2023-12-27T16:46:50.617075+00:00",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
        "contract": null,
        "decimals": 18,
        "price_in_usd": 3234.87,
        "precision": 6,
        "display_asset": ""
    },
    "toExchange": undefined,
}

export const initialQuote: Quote = {
    quote: {
        "source_network": {
            "deposit_methods": ["wallet"],
            "name": "BASE_MAINNET",
            "display_name": "Base",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/base_mainnet.png",
            "chain_id": "8453",
            "node_url": "https://lb.nodies.app/v1/cd20f05d16d24649b06f0e834a4d91c4",
            "nodes": ["https://lb.nodies.app/v1/cd20f05d16d24649b06f0e834a4d91c4"],
            "type": NetworkType.EVM,
            "transaction_explorer_template": "https://basescan.org/tx/{0}",
            "account_explorer_template": "https://basescan.org/address/{0}",
            "source_rank": 1,
            "destination_rank": 1,
            "token": {
                "symbol": "ETH",
                "display_asset": "ETH",
                "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 4007.99,
                "precision": 8,
                "listing_date": "2023-08-02T10:56:49.590891+00:00",
                "source_rank": 1,
                "destination_rank": 1
            },
            "metadata": {
                "listing_date": "2023-08-01T20:00:00+00:00",
                "evm_oracle_contract": "0x420000000000000000000000000000000000000F",
                "evm_multicall_contract": "0xca11bde05977b3631167028862be2a173976ca11"
            }
        },
        "source_token": {
            "symbol": "USDC",
            "display_asset": "USDC",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
            "contract": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            "decimals": 6,
            "price_in_usd": 0.999548,
            "precision": 6,
            "listing_date": "2023-09-14T16:21:22.07463+00:00",
            "source_rank": 2,
            "destination_rank": 2
        },
        "destination_network": {
            "deposit_methods": ["wallet"],
            "name": "ETHEREUM_MAINNET",
            "display_name": "Ethereum",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
            "chain_id": "1",
            "node_url": "https://ethereum-rpc.publicnode.com",
            "nodes": ["https://ethereum-rpc.publicnode.com"],
            "type": NetworkType.EVM,
            "transaction_explorer_template": "https://etherscan.io/tx/{0}",
            "account_explorer_template": "https://etherscan.io/address/{0}",
            "source_rank": 4,
            "destination_rank": 6,
            "token": {
                "symbol": "ETH",
                "display_asset": "ETH",
                "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 4007.99,
                "precision": 8,
                "listing_date": "2022-05-29T17:30:19.14963+00:00",
                "source_rank": 1,
                "destination_rank": 1
            },
            "metadata": {
                "listing_date": "2022-05-28T20:00:00+00:00",
                "evm_multicall_contract": "0xca11bde05977b3631167028862be2a173976ca11"
            }
        },
        "destination_token": {
            "symbol": "USDC",
            "display_asset": "USDC",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
            "contract": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            "decimals": 6,
            "price_in_usd": 0.999548,
            "precision": 6,
            "listing_date": "2023-01-12T13:57:46.771305+00:00",
            "source_rank": 2,
            "destination_rank": 3
        },
        "requested_amount": 0.825498,
        "receive_amount": 0.010078,
        "fee_discount": 0,
        "min_receive_amount": 0.009826,
        "blockchain_fee": 0.615304,
        "service_fee": 0.200115,
        "avg_completion_time": "00:00:15.3327252",
        "slippage": 0.025,
        "total_fee": 0.815419,
        "total_fee_in_usd": 0.81505,
    },

    refuel: {
        network: {
            "deposit_methods": ["wallet"],
            "name": "ETHEREUM_MAINNET",
            "display_name": "Ethereum",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
            "chain_id": "1",
            "node_url": "https://ethereum-rpc.publicnode.com",
            "nodes": ["https://ethereum-rpc.publicnode.com"],
            "type": NetworkType.EVM,
            "transaction_explorer_template": "https://etherscan.io/tx/{0}",
            "account_explorer_template": "https://etherscan.io/address/{0}",
            "source_rank": 4,
            "destination_rank": 6,
            "token": {
                "symbol": "ETH",
                "display_asset": "ETH",
                "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 4007.99,
                "precision": 8,
                "listing_date": "2022-05-29T17:30:19.14963+00:00",
                "source_rank": 1,
                "destination_rank": 1
            },
            "metadata": {
                "listing_date": "2022-05-28T20:00:00+00:00",
                "evm_multicall_contract": "0xca11bde05977b3631167028862be2a173976ca11"
            }
        },
        token: {
            "symbol": "ETH",
            "display_asset": "ETH",
            "logo": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
            "contract": null,
            "decimals": 18,
            "price_in_usd": 4007.99,
            "precision": 8,
            "listing_date": "2022-05-29T17:30:19.14963+00:00",
            "source_rank": 1,
            "destination_rank": 1
        },
        amount: 0.0003,
        amount_in_usd: 0.0003 * 4007.99 // ≈ 1.202397
    }
}