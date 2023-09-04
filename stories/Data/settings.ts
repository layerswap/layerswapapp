import { LayerSwapSettings } from "../../Models/LayerSwapSettings";

export const Settings = {
    "discovery": {
        "identity_url": "https://identity-api-dev.layerswap.cloud",
        "resource_storage_url": "https://devlslayerswapbridgesa.blob.core.windows.net/",
        "o_auth_providers": [
            {
                "provider": "COINBASE",
                "oauth_connect_url": "https://www.coinbase.com/oauth/authorize?client_id=6ee7b63f40353593848f27c4a4189f215cbc7c67b59c29ef4d23050aa90bfb0f&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Auser%3Aemail%2Cwallet%3Aaddresses%3Aread%2Cwallet%3Aaddresses%3Acreate&state=",
                "oauth_authorize_url": "https://www.coinbase.com/oauth/authorize?client_id=6ee7b63f40353593848f27c4a4189f215cbc7c67b59c29ef4d23050aa90bfb0f&redirect_uri=https%3A%2F%2Fbridge-api-dev.layerswap.cloud%2Fapi%2Fcallback%2Fcoinbase&response_type=code&account=all&scope=wallet%3Atransactions%3Aread%2Cwallet%3Auser%3Aread%2Cwallet%3Aaccounts%3Aread%2Cwallet%3Atransactions%3Asend%2Cwallet%3Auser%3Aemail&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=month&state="
            }
        ]
    },
    "exchanges": [
        {
            "display_name": "Coinbase",
            "internal_name": "COINBASE",
            "status": "active",
            "authorization_flow": "o_auth2",
            "type": "cex",
            "currencies": [
                {
                    "asset": "ETH",
                    "withdrawal_fee": 0,
                    "min_deposit_amount": 0.0001,
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true
                }
            ]
        },
        {
            "display_name": "Fake CEX (for testing)",
            "internal_name": "LSCEX",
            "status": "active",
            "authorization_flow": "none",
            "type": "cex",
            "currencies": [
                {
                    "asset": "ETH",
                    "withdrawal_fee": 0,
                    "min_deposit_amount": 0,
                    "network": "ETHEREUM_GOERLI",
                    "status": "active",
                    "is_default": false
                },
                {
                    "asset": "USDC",
                    "withdrawal_fee": 0,
                    "min_deposit_amount": 2,
                    "network": "ETHEREUM_GOERLI",
                    "status": "active",
                    "is_default": true
                },
                {
                    "asset": "ETH",
                    "withdrawal_fee": 0,
                    "min_deposit_amount": 0,
                    "network": "ARBITRUM_GOERLI",
                    "status": "active",
                    "is_default": true
                }
            ]
        },
        {
            "display_name": "Stripe (Only US)",
            "internal_name": "STRIPE",
            "status": "active",
            "authorization_flow": "none",
            "type": "fiat",
            "currencies": [
                {
                    "asset": "USDC",
                    "withdrawal_fee": 0,
                    "min_deposit_amount": 0,
                    "network": "POLYGON_MAINNET",
                    "status": "active",
                    "is_default": true
                }
            ]
        }
    ],
    "networks": [
        {
            "display_name": "Ethereum Goerli",
            "internal_name": "ETHEREUM_GOERLI",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:09:29.7050560",
            "chain_id": "5",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.etherscan.io/tx/{0}",
            "account_explorer_template": "https://goerli.etherscan.io/address/{0}",
            "currencies": [
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C",
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0.38,
                    "withdrawal_fee": 0.15,
                    "source_base_fee": 1,
                    "destination_base_fee": 1
                },
                {
                    "name": "IMX",
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": false,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 10,
                    "deposit_fee": 0.509783,
                    "withdrawal_fee": 0.202799,
                    "source_base_fee": 1.322345,
                    "destination_base_fee": 1.322345
                },
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000063,
                    "withdrawal_fee": 0.000063,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.000542
                }
            ]
        },
        {
            "display_name": "StarkNet Goerli",
            "internal_name": "STARKNET_GOERLI",
            "native_currency": null,
            "is_testnet": true,
            "average_completion_time": "00:01:52.0070860",
            "chain_id": "0x534e5f474f45524c49",
            "status": "active",
            "address_type": "starknet",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.voyager.online/tx/{0}",
            "account_explorer_template": "https://goerli.voyager.online/contract/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000007,
                    "withdrawal_fee": 0.000007,
                    "source_base_fee": 0.000552,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "ImmutableX Goerli",
            "internal_name": "IMMUTABLEX_GOERLI",
            "native_currency": "IMX",
            "is_testnet": true,
            "average_completion_time": "00:13:58.3918070",
            "chain_id": "5",
            "status": "active",
            "address_type": "immutable_x",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://immutascan.io/tx/{0}",
            "account_explorer_template": "https://immutascan.io/address/{0}",
            "currencies": [
                {
                    "name": "IMX",
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 10,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0.001322,
                    "source_base_fee": 1.322345,
                    "destination_base_fee": 1.322345
                },
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "insufficient_liquidity",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.000572,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
                    "decimals": 6,
                    "status": "insufficient_liquidity",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 1.02,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "is_testnet": true,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": "5",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "account_explorer_template": "https://explorer.loopring.io/account/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": false,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000823,
                    "withdrawal_fee": 0.000823,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.000542
                }
            ]
        },
        {
            "display_name": "Arbitrum One Goerli",
            "internal_name": "ARBITRUM_GOERLI",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:10:42.1351060",
            "chain_id": "421613",
            "status": "insufficient_liquidity",
            "address_type": "evm",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.arbiscan.io/tx/{0}",
            "account_explorer_template": "https://goerli.arbiscan.io/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "insufficient_liquidity",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000028,
                    "withdrawal_fee": 0.000028,
                    "source_base_fee": 0.000572,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": null,
                    "decimals": -1,
                    "status": "insufficient_liquidity",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "dYdX Goerli",
            "internal_name": "DYDX_GOERLI",
            "native_currency": null,
            "is_testnet": true,
            "average_completion_time": "00:18:17.1275430",
            "chain_id": "5",
            "status": "inactive",
            "address_type": "evm",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://trade.stage.dydx.exchange/portfolio/history/transfers",
            "account_explorer_template": "",
            "currencies": [
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": null,
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": false,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 1,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "Solana Testnet",
            "internal_name": "SOLANA_TESTNET",
            "native_currency": null,
            "is_testnet": true,
            "average_completion_time": "00:01:01.2422360",
            "chain_id": null,
            "status": "active",
            "address_type": "solana",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.solana.com/tx/{0}?cluster=testnet",
            "account_explorer_template": "",
            "currencies": [
                {
                    "name": "WETH",
                    "asset": "ETH",
                    "contract_address": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.000631,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "Linea Goerli",
            "internal_name": "LINEA_GOERLI",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "59140",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.lineascan.build/tx/{0}",
            "account_explorer_template": "",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.00021,
                    "withdrawal_fee": 0.00021,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.000542
                }
            ]
        },
        {
            "display_name": "PGN Testnet",
            "internal_name": "PGN_TESTNET",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "58008",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "https://explorer.sepolia.publicgoods.network/tx/{0}",
            "account_explorer_template": "https://explorer.sepolia.publicgoods.network/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000043,
                    "withdrawal_fee": 0.000043,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.000542
                }
            ]
        },
        {
            "display_name": "Base Goerli",
            "internal_name": "BASE_GOERLI",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "84531",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "https://goerli.basescan.org/tx/{0}",
            "account_explorer_template": "https://goerli.basescan.org/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000042,
                    "withdrawal_fee": 0.000042,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "EVMOS TESTNET",
            "internal_name": "EVMOS_TESTNET",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "9000",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "https://testnet.escan.live/tx/{0}",
            "account_explorer_template": "https://testnet.escan.live/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000823,
                    "withdrawal_fee": 0.000823,
                    "source_base_fee": 0.000052,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0x2099ed584fa1b64ecb85dc0d139d980564fced0f",
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 50,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "Mantle Testnet",
            "internal_name": "MANTLE_TESTNET",
            "native_currency": "MNT",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "5001",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "https://explorer.mantle.xyz/tx/{0}",
            "account_explorer_template": "https://explorer.mantle.xyz/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": "0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "MNT",
                    "asset": "MNT",
                    "contract_address": "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "display_name": "Zora Goerli",
            "internal_name": "ZORA_GOERLI",
            "native_currency": "ETH",
            "is_testnet": true,
            "average_completion_time": "00:00:00",
            "chain_id": "999",
            "status": "active",
            "address_type": "evm",
            "refuel_amount_in_usd": 1,
            "transaction_explorer_template": "https://testnet.explorer.zora.energy/tx/{0}",
            "account_explorer_template": "https://testnet.explorer.zora.energy/address/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.000542,
                    "destination_base_fee": 0.000542
                }
            ]
        }
    ],
    "currencies": [
        {
            "asset": "MNT",
            "precision": 6,
            "usd_price": 0.5
        },
        {
            "asset": "MATIC",
            "precision": 6,
            "usd_price": 0.87477
        },
        {
            "asset": "ETH",
            "precision": 6,
            "usd_price": 1823.03
        },
        {
            "asset": "USDC",
            "precision": 2,
            "usd_price": 1
        },
        {
            "asset": "IMX",
            "precision": 6,
            "usd_price": 0.645399
        }
    ]
}