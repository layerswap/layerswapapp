import { NetworkType } from "../../Models/Network";
import { SwapFormValues } from "../../components/DTOs/SwapFormValues";

export const initialValues: SwapFormValues = {
    "amount": "0.001803",
    "currencyGroup": {
        "symbol": "ETH",
        'logo': "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png"
    },
    "destination_address": "0xf51c208e2c37a99b13dcf01a3434cc71be8b2bdd",
    "from": {
        "tokens": [
            {
                "symbol": "USDC.e",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.e.png",
                "contract": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6
            },
            {
                "symbol": "USDC",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
                "contract": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6
            },
            {
                "symbol": "ETH",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 3234.87,
                "precision": 6
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
        "token": {
            "symbol": "ETH",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
            "contract": null,
            "decimals": 18,
            "price_in_usd": 0,
            "precision": 6
        },
        "metadata": {
            "listing_date": "2023-12-27T16:46:50.617075+00:00"
        },
        "deposit_methods": [
            "deposit_address",
            "wallet"
        ]
    },
    "fromCurrency": {
        "symbol": "ETH",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
        "contract": null,
        "decimals": 18,
        "price_in_usd": 3234.87,
        "precision": 6
    },
    fromExchange: undefined,
    to: {
        "tokens": [
            {
                "status": "active",
                "symbol": "USDC",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/usdc.png",
                "contract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "decimals": 6,
                "price_in_usd": 0.999873,
                "precision": 6
            },
            {
                "status": "active",
                "symbol": "ETH",
                "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
                "contract": null,
                "decimals": 18,
                "price_in_usd": 3234.87,
                "precision": 6
            }
        ],
        "name": "ETHEREUM_MAINNET",
        "display_name": "Ethereum",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/ethereum_mainnet.png",
        "chain_id": "1",
        "node_url": 'null',
        "type": NetworkType.EVM,
        "transaction_explorer_template": "https://etherscan.io/tx/{0}",
        "account_explorer_template": "https://etherscan.io/address/{0}",
        "token": {
            "symbol": "ETH",
            "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
            "contract": null,
            "decimals": 18,
            "price_in_usd": 3234.87,
            "precision": 6
        },
        "metadata": {
            "listing_date": "2023-12-27T16:46:50.617075+00:00"
        },
        "deposit_methods": [
            "deposit_address",
            "wallet"
        ]
    },
    "toCurrency": {
        "status": "active",
        "symbol": "ETH",
        "logo": "https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/currencies/eth.png",
        "contract": null,
        "decimals": 18,
        "price_in_usd": 3234.87,
        "precision": 6
    },
    "toExchange": undefined,
}