import { NetworkType } from "../../Models/CryptoNetwork";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";

export const Settings: LayerSwapSettings = {
    "exchanges": [
        {
            "display_name": "Coinbase",
            "internal_name": "COINBASE",
            "type": "cex",
            "is_featured": false,
            "metadata": {},
            "created_date": "2021-07-15T20:32:51.223453+00:00",
            "o_auth": {
                "connect_url": "https://www.coinbase.com/oauth/authorize?client_id=d1794c48e67c2eea97cef6154f42d0e099b13805264e739c96a9175a4acd9308&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Auser%3Aemail%2Cwallet%3Aaddresses%3Aread%2Cwallet%3Aaddresses%3Acreate&state=",
                "authorize_url": "https://www.coinbase.com/oauth/authorize?client_id=d1794c48e67c2eea97cef6154f42d0e099b13805264e739c96a9175a4acd9308&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Atransactions%3Aread%2Cwallet%3Auser%3Aread%2Cwallet%3Aaccounts%3Aread%2Cwallet%3Atransactions%3Asend%2Cwallet%3Auser%3Aemail&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=month&state="
            }
        },
        {
            "display_name": "Fake CEX (for testing)",
            "internal_name": "LSCEX",
            "type": "cex",
            "is_featured": true,
            "metadata": {},
            "created_date": "2023-01-13T13:23:55.633636+00:00",
            "o_auth": null
        }
    ],
    "networks": [
        {
            "display_name": "Brine Testnet",
            "internal_name": "BRINE_TESTNET",
            "is_featured": false,
            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "testnet",
            "type": NetworkType.EVM,
            "refuel_amount_in_usd": 0,
            "transaction_explorer_template": "https://testnet.brine.finance/history",
            "currencies": [
                {
                    "contract_address": "0xasd",
                    "asset": "USDC",
                    "decimals": 6,
                    "is_refuel_enabled": false,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
                }
            ],
            "nodes": [

            ],
            "created_date": "2023-08-30T12:27:38.362738+00:00"
        },
        {
            "display_name": "Ethereum Goerli",
            "internal_name": "ETHEREUM_GOERLI",
            "is_featured": true,
            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "5",
            "type": NetworkType.EVM,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.etherscan.io/tx/{0}",
            "currencies": [
                {
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "USDC",
                    "contract_address": "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
                    "decimals": 6,
                    "is_refuel_enabled": false,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "ETH",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "contract_address": null,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
                }
            ],
            "nodes": [
                {
                    "url": "https://eth-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                }
            ],
            "created_date": "2021-12-30T21:52:48.380446+00:00"
        },
        {
            "display_name": "StarkNet Goerli",
            "internal_name": "STARKNET_GOERLI",
            "is_featured": false,

            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "0x534e5f474f45524c49",
            "type": NetworkType.Starknet,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.voyager.online/tx/{0}",
            "currencies": [
                {
                    "asset": "ETH",
                    "contract_address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x7f9964a8Cc5579A4a039eC6C57b045138B4De68e30a2111D88DFbba488c244e"
                }
            ],
            "nodes": [
                {
                    "url": "https://starknet-testnet.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                }
            ],
            "created_date": "2022-03-07T12:42:16.204698+00:00"
        },
        {
            "display_name": "ImmutableX Goerli",
            "internal_name": "IMMUTABLEX_GOERLI",
            "is_featured": false,
            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "5",
            "type": NetworkType.StarkEx,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://immutascan.io/tx/{0}",
            "currencies": [
                {
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "ETH",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "contract_address": null,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "USDC",
                    "contract_address": "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
                    "decimals": 6,
                    "is_refuel_enabled": true,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
                }
            ],
            "nodes": [
                {
                    "url": "https://api.sandbox.x.immutable.com"
                }
            ],
            "created_date": "2022-10-25T11:58:18.781769+00:00"
        },
        {
            "display_name": "Arbitrum One Goerli",
            "internal_name": "ARBITRUM_GOERLI",
            "is_featured": true,
            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "421613",
            "type": NetworkType.EVM,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.arbiscan.io/tx/{0}",
            "currencies": [
                {
                    "asset": "USDC",
                    "contract_address": "0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892",
                    "decimals": 6,
                    "is_refuel_enabled": true,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "ETH",
                    "decimals": 18,
                    "is_refuel_enabled": true,
                    "contract_address": null,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
                }
            ],
            "nodes": [
                {
                    "url": "https://arbitrum-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                }
            ],
            "created_date": "2023-01-19T14:33:07.520931+00:00"
        },
        {
            "display_name": "Optimism Goerli",
            "internal_name": "OPTIMISM_GOERLI",
            "is_featured": false,
            "account_explorer_template": "https://etherscan.io/",
            "chain_id": "420",
            "type": NetworkType.EVM,
            "refuel_amount_in_usd": 0,
            "transaction_explorer_template": "https://goerli-optimism.etherscan.io/tx/{0}",
            "currencies": [
                {
                    "asset": "ETH",
                    "decimals": 18,
                    "is_refuel_enabled": false,
                    "contract_address": null,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                },
                {
                    "asset": "USDC",
                    "contract_address": "0x2b8C821263A3728054218832E6449e733323f4dD",
                    "decimals": 18,
                    "is_refuel_enabled": true,
                    "is_native": true,
                    "precision": 6,
                    "usd_price": 10,
                    "availableInDestination": true,
                    "availableInSource": true,
                }
            ],
            "metadata": {
                "multicall3": {
                    "address": "0xca11bde05977b3631167028862be2a173976ca11",
                    "blockCreated": 1746963
                }
            },
            "managed_accounts": [
                {
                    "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
                }
            ],
            "nodes": [
                {
                    "url": "https://optimism-goerli.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
                }
            ],
            "created_date": "2023-08-31T12:50:56.277466+00:00"
        }
    ],
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
        "iconUrl": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_goerli.png",
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
        "iconUrl": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/arbitrum_goerli.png",
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
        "iconUrl": "https://prodlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/optimism_goerli.png",
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