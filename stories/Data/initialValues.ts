import { NetworkType } from "../../Models/CryptoNetwork";
import { SwapFormValues } from "../../components/DTOs/SwapFormValues";

export const initialValues: SwapFormValues = {
    "amount": "0.001803",
    "currencyGroup": {
        "name": "ETH",
        "values": [
            {
                "asset": "ETH",
                "network": "STARKNET_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "LOOPRING_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "IMMUTABLEX_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ARBITRUM_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ZKSYNC_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ZKSPACE_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ARBITRUMNOVA_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "OPTIMISM_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ETHEREUM_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "BSC_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "RHINOFI_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "HECO_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "KCC_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "OKC_MAINNET"
            },
            {
                "asset": "WETH",
                "network": "SOLANA_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ZKSYNCERA_MAINNET"
            },
            {
                "asset": "WETH",
                "network": "POLYGON_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "POLYGONZK_MAINNET"
            },
            {
                "asset": "WETH.e",
                "network": "AVAX_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "LINEA_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "BASE_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "PGN_MAINNET"
            },
            {
                "asset": "WETH",
                "network": "MANTLE_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ZORA_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "ROLLUX_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "OPBNB_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "MANTA_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "SCROLL_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "MODE_MAINNET"
            },
            {
                "asset": "ETH",
                "network": "BLAST_MAINNET"
            }
        ],
        "groupedInBackend": true
    },
    "destination_address": "0xf51c208e2c37a99b13dcf01a3434cc71be8b2bdd",
    "from": {
        "assets": [
            {
                "asset": "USDT",
                "display_asset": null,
                "contract_address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "decimals": 6,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.999152,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": false,
                "availableInDestination": false
            },
            {
                "asset": "USDC.e",
                "display_asset": null,
                "contract_address": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                "decimals": 6,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.9948,
                "refuel_amount_in_usd": 1,
                "group_name": "USDC",
                "availableInSource": true,
                "availableInDestination": true
            },
            {
                "asset": "ETH",
                "display_asset": null,
                "contract_address": null,
                "decimals": 18,
                "is_native": true,
                "precision": 6,
                "usd_price": 3996.76,
                "refuel_amount_in_usd": null,
                "group_name": "ETH",
                "availableInSource": true,
                "availableInDestination": true
            },
            {
                "asset": "USDC",
                "display_asset": null,
                "contract_address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "decimals": 6,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.998613,
                "refuel_amount_in_usd": 0.8,
                "group_name": "USDC",
                "availableInSource": true,
                "availableInDestination": true
            }
        ],
        "img_url": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/arbitrum_mainnet.png",
        "is_featured": true,
        "display_name": "Arbitrum One",
        "internal_name": "ARBITRUM_MAINNET",
        "chain_id": "42161",
        "type": NetworkType.EVM,
        "transaction_explorer_template": "https://arbiscan.io/tx/{0}",
        "account_explorer_template": "https://arbiscan.io/address/{0}",
        "metadata": {
            "multicall3": {
                "address": "0xca11bde05977b3631167028862be2a173976ca11",
                "blockCreated": 7654707
            }
        },
        "created_date": "2021-09-20T20:00:00+00:00",
        "managed_accounts": [
            {
                "address": "0x2fc617e933a52713247ce25730f6695920b3befe",
            }
        ],
        "nodes": [
            {
                "url": "https://arbitrum-one.public.blastapi.io"
            }
        ]
    },
    "fromCurrency": {
        "asset": "ETH",
        "display_asset": null,
        "contract_address": null,
        "decimals": 18,
        "is_native": true,
        "precision": 6,
        "usd_price": 3996.76,
        "refuel_amount_in_usd": null,
        "group_name": "ETH",
        "availableInSource": true,
        "availableInDestination": true
    },
    fromExchange: undefined,
    to: {
        "assets": [
            {
                "asset": "USDT",
                "display_asset": null,
                "contract_address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "decimals": 6,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.999152,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": false,
                "availableInDestination": false
            },
            {
                "asset": "ZKS",
                "display_asset": null,
                "contract_address": "0xe4815AE53B124e7263F08dcDBBB757d41Ed658c6",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.04549573,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": false,
                "availableInDestination": false
            },
            {
                "asset": "BKT",
                "display_asset": null,
                "contract_address": "0x9d62526f5Ce701950c30F2cACa70Edf70f9fbf0F",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.00018693,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": false,
                "availableInDestination": false
            },
            {
                "asset": "USDC",
                "display_asset": null,
                "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "decimals": 6,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.998613,
                "refuel_amount_in_usd": 0.5,
                "group_name": "USDC",
                "availableInSource": true,
                "availableInDestination": true
            },
            {
                "asset": "LRC",
                "display_asset": null,
                "contract_address": "0xbbbbca6a901c926f240b89eacb641d8aec7aeafd",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.404365,
                "refuel_amount_in_usd": 0.5,
                "group_name": null,
                "availableInSource": true,
                "availableInDestination": true
            },
            {
                "asset": "ETH",
                "display_asset": null,
                "contract_address": null,
                "decimals": 18,
                "is_native": true,
                "precision": 6,
                "usd_price": 3996.76,
                "refuel_amount_in_usd": null,
                "group_name": "ETH",
                "availableInSource": true,
                "availableInDestination": true
            },
            {
                "asset": "IMX",
                "display_asset": null,
                "contract_address": "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 3.54,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": true,
                "availableInDestination": false
            },
            {
                "asset": "ASTR",
                "display_asset": null,
                "contract_address": "0x9bBAf650DcD8D3583195715Fc46b1118c3CfDdfd",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 0.165471,
                "refuel_amount_in_usd": null,
                "group_name": null,
                "availableInSource": false,
                "availableInDestination": false
            },
            {
                "asset": "SNX",
                "display_asset": null,
                "contract_address": "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
                "decimals": 18,
                "is_native": false,
                "precision": 6,
                "usd_price": 4.35,
                "refuel_amount_in_usd": 0.5,
                "group_name": null,
                "availableInSource": true,
                "availableInDestination": true
            }
        ],
        "img_url": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
        "is_featured": true,
        "display_name": "Ethereum",
        "internal_name": "ETHEREUM_MAINNET",
        "chain_id": "1",
        "type": NetworkType.EVM,
        "transaction_explorer_template": "https://etherscan.io/tx/{0}",
        "account_explorer_template": "https://etherscan.io/address/{0}",
        "metadata": {
            "multicall3": {
                "address": "0xca11bde05977b3631167028862be2a173976ca11",
                "blockCreated": 14353601
            },
            "ensRegistry": {
                "address": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
            },
            "ensUniversalResolver": {
                "address": "0xc0497E381f536Be9ce14B0dD3817cBcAe57d2F62",
            }
        },
        "created_date": "2022-05-28T20:00:00+00:00",
        "managed_accounts": [
            {
                "address": "0x2fc617e933a52713247ce25730f6695920b3befe",
            }
        ],
        "nodes": [
            {
                "url": "https://eth-mainnet.public.blastapi.io"
            }
        ]
    },
    "toCurrency": {
        "asset": "ETH",
        "display_asset": null,
        "contract_address": null,
        "decimals": 18,
        "is_native": true,
        "precision": 6,
        "usd_price": 3996.76,
        "refuel_amount_in_usd": null,
        "group_name": "ETH",
        "availableInSource": true,
        "availableInDestination": true
    },
    "toExchange": undefined,
}