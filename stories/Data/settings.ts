import { NetworkType } from "../../Models/Network";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";

export const Settings: LayerSwapSettings = {
    "networks": [
        {
            "tokens": [
                {
                    "symbol": "jUSDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/jusdc.png",
                    "contract": "EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728",
                    "decimals": 6,
                    "price_in_usd": 1.097,
                    "precision": 6,
                    "is_native": false,
                    "status": "active"
                },
                {
                    "symbol": "TON",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/ton.png",
                    "contract": null,
                    "decimals": 9,
                    "price_in_usd": 3.76,
                    "precision": 6,
                    "is_native": true,
                    "status": "active"
                }
            ],
            "name": "TON_MAINNET",
            "display_name": "Ton",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ton_mainnet.png",
            "chain_id": null,
            "node_url": "",
            "type": NetworkType.TON,
            "transaction_explorer_template": "https://tonscan.org/tx/{0}",
            "account_explorer_template": "https://tonscan.org/address/{0}",
            "metadata": {
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "evm_oracle_contract": null,
                "evm_multi_call_contract": null
            }
        },
        {
            "tokens": [
                {
                    "symbol": "USDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
                    "contract": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    "decimals": 6,
                    "price_in_usd": 1.002,
                    "precision": 6,
                    "is_native": false,
                    "status": "active"
                },
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                    "contract": null,
                    "decimals": 18,
                    "price_in_usd": 3272.24,
                    "precision": 6,
                    "is_native": true,
                    "status": "active"
                },
                {
                    "symbol": "USDC.e",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.e.png",
                    "contract": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                    "decimals": 6,
                    "price_in_usd": 1.002,
                    "precision": 6,
                    "is_native": false,
                    "status": "active"
                }
            ],
            "name": "ARBITRUM_MAINNET",
            "display_name": "Arbitrum One",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/arbitrum_mainnet.png",
            "chain_id": "42161",
            "node_url": "https://arbitrum-one.public.blastapi.io",
            "type": NetworkType.EVM,
            "transaction_explorer_template": "https://arbiscan.io/tx/{0}",
            "account_explorer_template": "https://arbiscan.io/address/{0}",
            "metadata": {
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "evm_oracle_contract": "",
                "evm_multi_call_contract": ""
            }
        },
        {
            "tokens": [
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                    "contract": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                    "decimals": 18,
                    "price_in_usd": 3272.24,
                    "precision": 6,
                    "is_native": true,
                    "status": "active"
                }
            ],
            "name": "STARKNET_MAINNET",
            "display_name": "StarkNet",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/starknet_mainnet.png",
            "chain_id": "0x534e5f4d41494e",
            "node_url": "https://starknet-mainnet.blastapi.io/0087e28f-aeff-41d3-8f42-0d46f40509c9",
            "type": NetworkType.Starknet,
            "transaction_explorer_template": "https://starkscan.co/tx/{0}",
            "account_explorer_template": "https://starkscan.co/contract/{0}",
            "metadata": {
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "evm_oracle_contract": "",
                "evm_multi_call_contract": ""
            }
        },
        {
            "tokens": [],
            "name": "ETHEREUM_MAINNET",
            "display_name": "Ethereum",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
            "chain_id": "1",
            "node_url": "",
            "type": NetworkType.EVM,
            "transaction_explorer_template": "https://etherscan.io/tx/{0}",
            "account_explorer_template": "https://etherscan.io/address/{0}",
            "metadata": {
                "listing_date": "2023-12-27T16:46:50.617075+00:00",
                "evm_oracle_contract": "",
                "evm_multi_call_contract": ""
            }
        }
    ],
    "exchanges": [
        {
            "token_groups": [
                {
                    "symbol": "USDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/usdc.png"
                },
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/eth.png"
                }
            ],
            "name": "STRIPE",
            "display_name": "Stripe (Only US)",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/exchanges/stripe.png",
            "metadata": {
                "o_auth": null,
                "listing_date": "2023-05-23T16:16:30.241581+00:00"
            }
        },
        {
            "token_groups": [
                {
                    "symbol": "USDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/usdc.png"
                },
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/eth.png"
                }
            ],
            "name": "COINBASE",
            "display_name": "Coinbase",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/exchanges/coinbase.png",
            "metadata": {
                "o_auth": {
                    "authorize_url": "https://www.coinbase.com/oauth/authorize?client_id=d1794c48e67c2eea97cef6154f42d0e099b13805264e739c96a9175a4acd9308&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Atransactions%3Aread%2Cwallet%3Auser%3Aread%2Cwallet%3Aaccounts%3Aread%2Cwallet%3Atransactions%3Asend%2Cwallet%3Auser%3Aemail&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=month&state=",
                    "connect_url": "https://www.coinbase.com/oauth/authorize?client_id=d1794c48e67c2eea97cef6154f42d0e099b13805264e739c96a9175a4acd9308&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Auser%3Aemail%2Cwallet%3Aaddresses%3Aread%2Cwallet%3Aaddresses%3Acreate&state="
                },
                "listing_date": "2021-07-15T20:32:51.223453+00:00"
            }
        },
        {
            "token_groups": [
                {
                    "symbol": "USDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/usdc.png"
                },
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/eth.png"
                }
            ],
            "name": "LSCEX",
            "display_name": "Fake CEX (for testing)",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/exchanges/lscex.png",
            "metadata": {
                "o_auth": null,
                "listing_date": "2023-01-13T13:23:55.633636+00:00"
            }
        },
        {
            "token_groups": [
                {
                    "symbol": "USDC",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/usdc.png"
                },
                {
                    "symbol": "ETH",
                    "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/eth.png"
                }
            ],
            "name": "PIPE",
            "display_name": "Pipe",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/exchanges/pipe.png",
            "metadata": {
                "o_auth": null,
                "listing_date": "2023-10-26T11:33:05.256894+00:00"
            }
        }
    ],
    "sources": [],
    "destinations": []
}

export const SettingChains: any = [
    {
        "id": 5,
        "name": "Ethereum Goerli",
        "network": "ETHEREUM_GOERLI",
        "nativeCurrency": {
            "name": "IMX",
            "symbol": "IMX",
            "decimals": 18
        },
        "iconUrl": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_goerli.png",
        "rpcUrls": {
            "default": {
                "http": [
                    "https://eth-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            },
            "public": {
                "http": [
                    "https://eth-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            }
        },
        "blockExplorers": {
            "default": {
                "name": "name",
                "url": "https://goerli.etherscan.io"
            }
        },
        "contracts": {
            "multicall3": {
                "address": "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
                "blockCreated": 1746963
            }
        },
        "fees": {}
    },
    {
        "id": 421613,
        "name": "Arbitrum One Goerli",
        "network": "ARBITRUM_GOERLI",
        "nativeCurrency": {
            "name": "USDC",
            "symbol": "USDC",
            "decimals": 6
        },
        "iconUrl": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/arbitrum_sepolia.png",
        "rpcUrls": {
            "default": {
                "http": [
                    "https://arbitrum-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            },
            "public": {
                "http": [
                    "https://arbitrum-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            }
        },
        "blockExplorers": {
            "default": {
                "name": "name",
                "url": "https://goerli.arbiscan.io"
            }
        },
        "contracts": {
            "multicall3": {
                "address": "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
                "blockCreated": 1746963
            }
        },
        "fees": {}
    },
    {
        "id": 420,
        "name": "Optimism Goerli",
        "network": "OPTIMISM_GOERLI",
        "nativeCurrency": {
            "name": "ETH",
            "symbol": "ETH",
            "decimals": 18
        },
        "iconUrl": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/optimism_goerli.png",
        "rpcUrls": {
            "default": {
                "http": [
                    "https://optimism-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            },
            "public": {
                "http": [
                    "https://optimism-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                ]
            }
        },
        "blockExplorers": {
            "default": {
                "name": "name",
                "url": "https://goerli-optimism.etherscan.io"
            }
        },
        "contracts": {
            "multicall3": {
                "address": "0xca11bde05977b3631167028862be2a173976ca11",
                "blockCreated": 1746963
            }
        },
        "fees": {}
    }
]