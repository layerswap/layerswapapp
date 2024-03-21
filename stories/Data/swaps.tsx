import { NetworkType } from "../../Models/Network"
import { SwapStatus } from "../../Models/SwapStatus"
import { SwapItem, BackendTransactionStatus, TransactionType } from "../../lib/layerSwapApiClient"

export const swap: SwapItem = {
    "id": "39dbe478-5a7d-427c-b316-cc8c362ec010",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2308
    },
    "requested_amount": 0.0015,
    "deposit_mode": "",
    "source_address": "0xisjvievhi83r7837r883h83hd838dd8h38",
    "exchange_account_connected": false,
    "created_date": "2023-08-16T16:31:11.934618+00:00",
    "status": SwapStatus.Created,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "",
    "transactions": [
        {
            "from": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "to": "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
            "created_date": "2023-08-16T16:31:50.028165+00:00",
            "transaction_hash": "0x40eb981625e69775664049fb930d489ff766a906c0528ffdb32715636d145962",
            "confirmations": 3,
            "max_confirmations": 3,
            "amount": 0.0015,
            "usd_price": 1819.02,
            "type": TransactionType.Input,
            "usd_value": 2.728530,
            "status": BackendTransactionStatus.Pending,
        },
        {
            "from": "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
            "to": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "created_date": "2023-08-16T16:33:23.4937+00:00",
            "transaction_hash": "0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
            "confirmations": 28,
            "max_confirmations": 12,
            "amount": 0.00093,
            "usd_price": 1819.02,
            "type": TransactionType.Output,
            "status": BackendTransactionStatus.Pending,
            "usd_value": 1.6916886
        },
        {
            "amount": 0.000271,
            "confirmations": 15,
            "created_date": "2023-08-15T15:38:46.036437+00:00",
            "from": "0xe66aa98b55c5a55c9af9da12fe39b8868af9a346",
            "max_confirmations": 12,
            "to": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "transaction_hash": "0x673d993640252bc40e7f69291a341deea2bb5250e8b13531b9e1412e326c5c42",
            "type": TransactionType.Refuel,
            "usd_price": 1840.02,
            "usd_value": 0.49864542,
            "status": BackendTransactionStatus.Pending,
        }
    ],
}

export const failedSwap: SwapItem = {
    "id": "9c68c265-c9d0-4b52-8e2a-bd309e565451",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2571
    },
    "deposit_mode": "",
    "source_address": "0xlskcsvknskvkscnkjcnskncskncksvsv",
    "requested_amount": 0.0018,
    "exchange_account_connected": false,
    "created_date": "2023-08-30T09:04:41.673486+00:00",
    "status": SwapStatus.Failed,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "",
    "transactions": [
        {
            "from": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "to": "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
            "created_date": "2023-08-30T09:07:34.213877+00:00",
            "transaction_hash": "0x43b595400b4e61560846f87115f5b0273ae5f6f1a390f107dca722115a0cd2bf",
            "confirmations": 3,
            "max_confirmations": 3,
            "amount": 0.0018,
            "usd_price": 1718.42,
            "type": TransactionType.Input,
            "status": BackendTransactionStatus.Pending,
            "usd_value": 3.093156
        },
    ]
}

export const failedInputSwap: SwapItem = {
    "id": "d8a32946-1250-46d3-999f-cd195304c55e",
    "requested_amount": 0.0018,
    "exchange_account_connected": false,
    "created_date": "2024-02-23T12:41:48.389955+00:00",
    "status": SwapStatus.Failed,
    "deposit_mode": "",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2570
    },
    "source_address": "0xf51c208e2c37a99b13dcf01a3434ccsvsvsvsvs",
    "destination_address": "0xf51c208e2c37a99b13dcf01a3434cc71be8b2bdd",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "",
    "transactions": [
        {
            "from": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "to": "0xf51c208e2c37a99b13dcf01a3434cc71be8b2bdd",
            "created_date": "2023-08-30T09:07:34.213877+00:00",
            "transaction_hash": "0x529ab89f4ed2ece53ca51f52d11e5123f5e5c43c09a9d054d243de0e0829d15f",
            "confirmations": 3,
            "max_confirmations": 3,
            "amount": 0.0018,
            "usd_price": 1718.42,
            "type": TransactionType.Input,
            "status": BackendTransactionStatus.Failed,
            "usd_value": 3.093156
        },
    ]
}

export const failedSwapOutOfRange: SwapItem = {
    "id": "343a77b7-6a38-4918-9e10-866784b77d9f",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2570
    },
    "requested_amount": 0.0015,
    "exchange_account_connected": false,
    "deposit_mode": "",
    "source_address": "0xd11Ed17eF0F48a9941fD4A66",
    "created_date": "2023-08-29T14:16:02.389108+00:00",
    "status": SwapStatus.Failed,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "received_more_than_valid_range",
    "transactions": [
        {
            "from": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "to": "0x21d35f8d47a20a9e652a8eb35ebcbffffa50059c",
            "created_date": "2023-08-29T14:17:14.689017+00:00",
            "transaction_hash": "0x81677f514f897fd49f5d3fab1c6e09c13aa4613cd1a98749e0f3899cd331cd7a",
            "confirmations": 0,
            "max_confirmations": 3,
            "amount": 0.11,
            "usd_price": 1643.98,
            "type": TransactionType.Input,
            "status": BackendTransactionStatus.Pending,
            "usd_value": 180.8378
        },
        {
            "amount": 0.000271,
            "confirmations": 15,
            "created_date": "2023-08-15T15:38:46.036437+00:00",
            "from": "0xe66aa98b55c5a55c9af9da12fe39b8868af9a346",
            "max_confirmations": 12,
            "to": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "transaction_hash": "0x673d993640252bc40e7f69291a341deea2bb5250e8b13531b9e1412e326c5c42",
            "type": TransactionType.Refuel,
            "status": BackendTransactionStatus.Pending,
            "usd_price": 1840.02,
            "usd_value": 0.49864542,
        }
    ]
}

export const cancelled: SwapItem = {
    "id": "343a77b7-6a38-4918-9e10-866784b77d9f",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2570
    },
    "deposit_mode": "",
    "source_address": "0xd11Ed17eF0F48a9941fD4A66",
    "requested_amount": 0.0015,
    "exchange_account_connected": false,
    "created_date": "2023-08-29T14:16:02.389108+00:00",
    "status": SwapStatus.Cancelled,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "",
    "transactions": [

    ]
}

export const expired: SwapItem = {
    "id": "343a77b7-6a38-4918-9e10-866784b77d9f",
    "metadata": {
        "reference_id": null,
        "app": null,
        "sequence_number": 2570
    },
    "source_address": "0x42c03fC8fd30d11Ed17eF0F48a9941fD4A66svsv",
    "requested_amount": 0.0015,
    "deposit_mode": "",
    "exchange_account_connected": false,
    "created_date": "2023-08-29T14:16:02.389108+00:00",
    "status": SwapStatus.Expired,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "source_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "destination_token": {
        "symbol": "",
        "logo": "",
        "contract": "",
        "decimals": 18,
        "price_in_usd": 2,
        "precision": 6,
        "is_native": false,
        "status": "active"
    },
    "destination_network": {
        "account_explorer_template": "snjsncj",
        "chain_id": "1",
        "display_name": "",
        "logo": "",
        "metadata": {
            "listing_date": ""
        },
        "name": "",
        "node_url": "",
        "transaction_explorer_template": "",
        "type": NetworkType.EVM
    },
    "refuel": {
        "token": {
            "symbol": "",
            "logo": "",
            "contract": "",
            "decimals": 18,
            "price_in_usd": 2,
            "precision": 6,
            "is_native": false,
            "status": "active"
        },
        "network": {
            "account_explorer_template": "snjsncj",
            "chain_id": "1",
            "display_name": "",
            "logo": "",
            "metadata": {
                "listing_date": ""
            },
            "name": "",
            "node_url": "",
            "transaction_explorer_template": "",
            "type": NetworkType.EVM
        },
        "refuel_amount": 6
    },
    "fail_reason": "",
    "transactions": [

    ]
}