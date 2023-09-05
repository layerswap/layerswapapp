import { NetworkAddressType } from "../../Models/CryptoNetwork";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";

export const Settings: LayerSwapSettings = {
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
            "type": "cex",
            "authorization_flow": "o_auth2",
            "currencies": [
                {
                    "withdrawal_fee": 8,
                    "min_deposit_amount": 9,
                    "asset": "ETH",
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true,
                    "name": "Bla",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 11,
                    "deposit_fee": 9,
                    "contract_address": "0s8c89s0c9sokosmc",
                    "decimals": 34,
                    "source_base_fee": 3,
                    "destination_base_fee": 21
                }
            ],
        },
        {
            "display_name": "Fake CEX (for testing)",
            "internal_name": "LSCEX",
            "status": "active",
            "type": "cex",
            "authorization_flow": "o_auth2",
            "currencies": [
                {
                    "withdrawal_fee": 8,
                    "min_deposit_amount": 9,
                    "asset": "ETH",
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true,
                    "name": "Bla",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 11,
                    "deposit_fee": 9,
                    "contract_address": "0s8c89s0c9sokosmc",
                    "decimals": 34,
                    "source_base_fee": 3,
                    "destination_base_fee": 21
                },
                {
                    "withdrawal_fee": 8,
                    "min_deposit_amount": 9,
                    "asset": "ETH",
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true,
                    "name": "Bla",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 11,
                    "deposit_fee": 9,
                    "contract_address": "0s8c89s0c9sokosmc",
                    "decimals": 34,
                    "source_base_fee": 3,
                    "destination_base_fee": 21
                },
                {
                    "withdrawal_fee": 8,
                    "min_deposit_amount": 9,
                    "asset": "ETH",
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true,
                    "name": "Bla",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 11,
                    "deposit_fee": 9,
                    "contract_address": "0s8c89s0c9sokosmc",
                    "decimals": 34,
                    "source_base_fee": 3,
                    "destination_base_fee": 21
                }
            ],
        },
        {
            "display_name": "Stripe (Only US)",
            "internal_name": "STRIPE",
            "status": "active",
            "type": "fiat",
            "authorization_flow": "o_auth2",
            "currencies": [
                {
                    "withdrawal_fee": 8,
                    "min_deposit_amount": 9,
                    "asset": "ETH",
                    "network": "ETHEREUM_MAINNET",
                    "status": "active",
                    "is_default": true,
                    "name": "Bla",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 11,
                    "deposit_fee": 9,
                    "contract_address": "0s8c89s0c9sokosmc",
                    "decimals": 34,
                    "source_base_fee": 3,
                    "destination_base_fee": 21
                }
            ],
        }
    ],
    "networks": [
        {
            "display_name": "Brine Testnet",
            "internal_name": "BRINE_TESTNET",
            "native_currency": "USDC",
            "average_completion_time": "00:00:00",
            "chain_id": "testnet",
            "status": "active",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 0,
            "transaction_explorer_template": "https://testnet.brine.finance/history",
            "fee_multiplier": 9,
            "currencies": [
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": null,
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 10,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                }
            ],
        },
        {
            "display_name": "Ethereum Goerli",
            "internal_name": "ETHEREUM_GOERLI",
            "native_currency": "ETH",
            "average_completion_time": "00:09:29.7050560",
            "chain_id": "5",
            "status": "active",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.etherscan.io/tx/{0}",
            "fee_multiplier": 9,
            "currencies": [
                {
                    "name": "IMX",
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "status": "inactive",
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
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
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
            "fee_multiplier": 9,
            "display_name": "StarkNet Goerli",
            "internal_name": "STARKNET_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:01:52.0070860",
            "chain_id": "0x534e5f474f45524c49",
            "status": "active",
            "address_type": NetworkAddressType.starknet,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://goerli.voyager.online/tx/{0}",
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
            "fee_multiplier": 9,
            "display_name": "ImmutableX Goerli",
            "internal_name": "IMMUTABLEX_GOERLI",
            "native_currency": "IMX",
            "average_completion_time": "00:13:58.3918070",
            "chain_id": "5",
            "status": "active",
            "address_type": NetworkAddressType.immutable_x,
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://immutascan.io/tx/{0}",
            "currencies": [
                {
                    "name": "IMX",
                    "asset": "IMX",
                    "contract_address": "0x1facdd0165489f373255a90304650e15481b2c85",
                    "decimals": 18,
                    "status": "inactive",
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
                    "status": "active",
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
                    "status": "active",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892",
                    "decimals": 6,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 100,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0.000028,
                    "withdrawal_fee": 0.000028,
                    "source_base_fee": 0.000572,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "WETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Loopring Goerli",
            "internal_name": "LOOPRING_GOERLI",
            "native_currency": null,
            "average_completion_time": "00:05:19.5912930",
            "chain_id": null,
            "address_type": NetworkAddressType.evm,
            "status": "inactive",
            "refuel_amount_in_usd": 0.5,
            "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Mantle Testnet",
            "internal_name": "MANTLE_TESTNET",
            "native_currency": "MNT",
            "average_completion_time": "00:00:00",
            "chain_id": null,
            "status": "inactive",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "https://explorer.mantle.xyz/tx/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
            "fee_multiplier": 9,
            "display_name": "Zora Goerli",
            "internal_name": "ZORA_GOERLI",
            "native_currency": "ETH",
            "average_completion_time": "00:00:00",
            "chain_id": null,
            "status": "inactive",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 1,
            "transaction_explorer_template": "https://testnet.explorer.zora.energy/tx/{0}",
            "currencies": [
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
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
        },
        {
            "fee_multiplier": 9,
            "display_name": "opBNB Testnet",
            "internal_name": "OPBNB_TESTNET",
            "native_currency": "BNB",
            "average_completion_time": "00:00:00",
            "chain_id": null,
            "status": "inactive",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 1.0,
            "transaction_explorer_template": "http://opbnbscan.com/tx/{0}",
            "currencies": [
                {
                    "name": "BNB",
                    "asset": "BNB",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": false,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                },
                {
                    "name": "ETH",
                    "asset": "ETH",
                    "contract_address": null,
                    "decimals": null,
                    "status": "inactive",
                    "is_deposit_enabled": false,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 0.1,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0.0
                }
            ]
        },
        {
            "fee_multiplier": 9,
            "display_name": "Optimism Goerli",
            "internal_name": "OPTIMISM_GOERLI",
            "native_currency": "ETH",
            "average_completion_time": "00:00:00",
            "chain_id": "420",
            "status": "active",
            "address_type": NetworkAddressType.evm,
            "refuel_amount_in_usd": 0,
            "transaction_explorer_template": "https://goerli-optimism.etherscan.io/tx/{0}",
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
                    "max_withdrawal_amount": 0.015,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0.0,
                    "destination_base_fee": 0
                },
                {
                    "name": "USDC",
                    "asset": "USDC",
                    "contract_address": "0x2b8C821263A3728054218832E6449e733323f4dD",
                    "decimals": 18,
                    "status": "active",
                    "is_deposit_enabled": true,
                    "is_withdrawal_enabled": true,
                    "is_refuel_enabled": true,
                    "max_withdrawal_amount": 15,
                    "deposit_fee": 0,
                    "withdrawal_fee": 0,
                    "source_base_fee": 0,
                    "destination_base_fee": 0.0
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
            "asset": "ETH",
            "precision": 6,
            "usd_price": 1704.35
        },
        {
            "asset": "USDC",
            "precision": 2,
            "usd_price": 0.998718
        },
        {
            "asset": "IMX",
            "precision": 6,
            "usd_price": 0.581917
        },
        {
            "asset": "BNB",
            "precision": 6,
            "usd_price": 223.2
        },
        {
            "asset": "MATIC",
            "precision": 6,
            "usd_price": 0.87477
        }
    ]
}