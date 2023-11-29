import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { THEME_COLORS, ThemeData } from '../Models/Theme'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork'

type IndexProps = {
  settings?: LayerSwapSettings,
  themeData?: ThemeData,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}

export default function Home({ settings, inMaintanance, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <Swap />
    </Layout>
  </>)
}

export async function getServerSideProps(context) {

  let result: IndexProps = {
    inMaintanance: false,
  };
  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );
  result.themeData = await getThemeData(context.query.theme || context.query.addressSource)


  //TODO get from api
  result.settings = {
    networks: networksMock as CryptoNetwork[],
    currencies: [],
    discovery: {
      identity_url: "",
      o_auth_providers: [],
      resource_storage_url: ""
    },
    exchanges: [],
  }

  return {
    props: result,
  }
}

const getThemeData = async (theme_name: string) => {
  try {
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    return THEME_COLORS[theme_name] || null;
  }
  catch (e) {
    console.log(e)
  }
}


const networksMock = [
  {
    "display_name": "Ethereum Goerli",
    "internal_name": "ETHEREUM_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:02:51.3380190",
    "chain_id": "5",
    "status": "active",
    "type": "evm",
    "refuel_amount_in_usd": 0.1,
    "transaction_explorer_template": "https://goerli.etherscan.io/tx/{0}",
    "account_explorer_template": "https://goerli.etherscan.io/address/{0}",
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
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.000609,
        "withdrawal_fee": 0.000609,
        "source_base_fee": 0.000005,
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
        "max_withdrawal_amount": 500,
        "deposit_fee": 2,
        "withdrawal_fee": 2,
        "source_base_fee": 1,
        "destination_base_fee": 1
      }
    ],
    "metadata": {
      "multicall3": {
        "address": "0xca11bde05977b3631167028862be2a173976ca11",
        "blockCreated": 6507670
      },
      "ensRegistry": {
        "address": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
      },
      "ensUniversalResolver": {
        "address": "0x56522D00C410a43BFfDF00a9A569489297385790",
        "blockCreated": 8765204
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
    "created_date": "2023-05-18T13:24:28.927361+00:00"
  },
  {
    "display_name": "ImmutableX Goerli",
    "internal_name": "IMMUTABLEX_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:01:22.8432680",
    "chain_id": "5",
    "status": "insufficient_liquidity",
    "type": "stark_ex",
    "refuel_amount_in_usd": 0.1,
    "transaction_explorer_template": "https://immutascan.io/tx/{0}",
    "account_explorer_template": "https://immutascan.io/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": 18,
        "status": "insufficient_liquidity",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": {
      "L1Network": "ETHEREUM_GOERLI"
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
    "created_date": "2023-05-18T13:24:29.001971+00:00"
  },
  {
    "display_name": "Arbitrum One Goerli",
    "internal_name": "ARBITRUM_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:07:05.5174510",
    "chain_id": "421613",
    "status": "active",
    "type": "evm",
    "refuel_amount_in_usd": 0.1,
    "transaction_explorer_template": "https://goerli.arbiscan.io/tx/{0}",
    "account_explorer_template": "https://goerli.arbiscan.io/address/{0}",
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
        "max_withdrawal_amount": 500,
        "deposit_fee": 0.000111,
        "withdrawal_fee": 0.000111,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0
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
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.000111,
        "withdrawal_fee": 0.000111,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": {
      "multicall3": {
        "address": "0xca11bde05977b3631167028862be2a173976ca11",
        "blockCreated": 88114
      }
    },
    "managed_accounts": [
      {
        "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
      }
    ],
    "nodes": [
      {
        "url": "https://goerli-rollup.arbitrum.io/rpc"
      }
    ],
    "created_date": "2023-05-18T13:26:46.502048+00:00"
  },
  {
    "display_name": "Starknet Goerli",
    "internal_name": "STARKNET_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:11:20.8209810",
    "chain_id": "0x534e5f474f45524c49",
    "status": "active",
    "type": "starknet",
    "refuel_amount_in_usd": 0.1,
    "transaction_explorer_template": "https://testnet.starkscan.co/tx/{0}",
    "account_explorer_template": "https://testnet.starkscan.co/contract/{0}",
    "currencies": [
      {
        "name": "USDC",
        "asset": "USDC",
        "contract_address": "0x05a8b3e116670381596e169c09de832f0055a4408464dc2cdadaca3d0aa3993a",
        "decimals": 6,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 500,
        "deposit_fee": 0.00085,
        "withdrawal_fee": 0.00085,
        "source_base_fee": 2,
        "destination_base_fee": 2
      },
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        "decimals": 18,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.00085,
        "withdrawal_fee": 0.00085,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": {
      "WatchdogContractAddress": "0x056b277d1044208632456902079f19370e0be63b1a4745f04f96c8c652237dbc"
    },
    "managed_accounts": [
      {
        "address": "0x2109F6e78970B282e6068d255EA4c815D14f68a31a9d3330c74d4eB56a0d724"
      }
    ],
    "nodes": [
      {
        "url": "https://starknet-testnet.blastapi.io/84acb0b4-99f6-4a3d-9f63-15d71d9875ef"
      }
    ],
    "created_date": "2023-05-18T13:28:23.023141+00:00"
  },
  {
    "display_name": "Optimism Goerli",
    "internal_name": "OPTIMISM_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": "420",
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 1.0,
    "transaction_explorer_template": "https://goerli-optimism.etherscan.io/tx/{0}",
    "account_explorer_template": "https://goerli-optimism.etherscan.io/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": null,
        "status": "active",
        "is_deposit_enabled": false,
        "is_withdrawal_enabled": false,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.000197,
        "withdrawal_fee": 0.000197,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": {
      "GasPriceOracleContract": "0x420000000000000000000000000000000000000F"
    },
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-06-29T12:07:54.044043+00:00"
  },
  {
    "display_name": "Polygon Mumbai",
    "internal_name": "POLYGON_MUMBAI",
    "native_currency": "MATIC",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": null,
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 1.0,
    "transaction_explorer_template": "https://mumbai.polygonscan.com/tx/{0}",
    "account_explorer_template": "https://mumbai.polygonscan.com/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": null,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": true,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.0000197,
        "withdrawal_fee": 0.0000197,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": null,
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-06-29T13:15:52.658811+00:00"
  },
  {
    "display_name": "Loopring Goerli",
    "internal_name": "LOOPRING_GOERLI",
    "native_currency": null,
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": null,
    "status": "inactive",
    "type": "zk_sync_lite",
    "refuel_amount_in_usd": 1.0,
    "transaction_explorer_template": "https://explorer.loopring.io/tx/{0}-transfer\n",
    "account_explorer_template": "https://explorer.loopring.io/account/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": null,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.0000197,
        "withdrawal_fee": 0.0000197,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": null,
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-06-29T13:19:46.780485+00:00"
  },
  {
    "display_name": "Solana Testnet",
    "internal_name": "SOLANA_TESTNET",
    "native_currency": "SOL",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": null,
    "status": "inactive",
    "type": "solana",
    "refuel_amount_in_usd": 1.0,
    "transaction_explorer_template": "https://explorer.solana.com/tx/{0}?cluster=testnet\n",
    "account_explorer_template": "https://explorer.solana.com/address/{0}?cluster=testnet",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": null,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.0000197,
        "withdrawal_fee": 0.0000197,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": null,
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-06-29T13:20:36.26041+00:00"
  },
  {
    "display_name": "Zksync Era Goerli",
    "internal_name": "ZKSYNCERA_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": null,
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 1.0,
    "transaction_explorer_template": "https://goerli.explorer.zksync.io/tx/{0}",
    "account_explorer_template": "https://goerli.explorer.zksync.io/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": null,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.01,
        "deposit_fee": 0.000197,
        "withdrawal_fee": 0.000197,
        "source_base_fee": 0.000005,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": null,
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-06-29T13:29:56.948135+00:00"
  },
  {
    "display_name": "Linea Goerli",
    "internal_name": "LINEA_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:01:54.5055450",
    "chain_id": "59140",
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 1,
    "transaction_explorer_template": "https://goerli.lineascan.build/tx/{0}",
    "account_explorer_template": "https://goerli.lineascan.build/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": 18,
        "status": "insufficient_liquidity",
        "is_deposit_enabled": false,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0.1,
        "deposit_fee": 0.000362,
        "withdrawal_fee": 0.000362,
        "source_base_fee": 0.001052,
        "destination_base_fee": 0.0
      }
    ],
    "metadata": null,
    "managed_accounts": [
      {
        "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
      }
    ],
    "nodes": [

    ],
    "created_date": "2023-07-13T15:37:01.417347+00:00"
  },
  {
    "display_name": "Base Goerli",
    "internal_name": "BASE_GOERLI",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:00:00",
    "chain_id": "84531",
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 0,
    "transaction_explorer_template": "https://goerli.basescan.org/tx/{0}",
    "account_explorer_template": "https://goerli.basescan.org/address/{0}",
    "currencies": [
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": 18,
        "status": "inactive",
        "is_deposit_enabled": false,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0,
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "source_base_fee": 0,
        "destination_base_fee": 0
      }
    ],
    "metadata": {
      "GasPriceOracleContract": "0x420000000000000000000000000000000000000F"
    },
    "managed_accounts": [

    ],
    "nodes": [

    ],
    "created_date": "2023-08-02T10:55:14.611772+00:00"
  },
  {
    "display_name": "Evmos Testnet",
    "internal_name": "EVMOS_TESTNET",
    "native_currency": "EVMOS",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": "9000",
    "status": "inactive",
    "type": "evm",
    "refuel_amount_in_usd": 0.05,
    "transaction_explorer_template": "https://testnet.escan.live/tx/{0}",
    "account_explorer_template": "https://testnet.escan.live/address/{0}",
    "currencies": [
      {
        "name": "",
        "asset": "EVMOS",
        "contract_address": null,
        "decimals": 18,
        "status": "inactive",
        "is_deposit_enabled": false,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 0,
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "source_base_fee": 0.0,
        "destination_base_fee": 0
      },
      {
        "name": "alUSDC",
        "asset": "USDC",
        "contract_address": null,
        "decimals": 6,
        "status": "active",
        "is_deposit_enabled": false,
        "is_withdrawal_enabled": true,
        "is_refuel_enabled": true,
        "max_withdrawal_amount": 10,
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "source_base_fee": 0,
        "destination_base_fee": 0
      }
    ],
    "metadata": null,
    "managed_accounts": [
      {
        "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
      }
    ],
    "nodes": [

    ],
    "created_date": "2023-08-07T15:02:46.100354+00:00"
  },
  {
    "display_name": "Brine Testnet",
    "internal_name": "BRINE_TESTNET",
    "native_currency": null,
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:05:42.2878680",
    "chain_id": "testnet",
    "status": "active",
    "type": "stark_ex",
    "refuel_amount_in_usd": 1,
    "transaction_explorer_template": "https://testnet.brine.finance/",
    "account_explorer_template": "https://testnet.brine.finance/",
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
        "max_withdrawal_amount": 30,
        "deposit_fee": 0.00085,
        "withdrawal_fee": 0.00085,
        "source_base_fee": 2,
        "destination_base_fee": 2
      }
    ],
    "metadata": {
      "ActivationUrl": "https://testnet.brine.finance"
    },
    "managed_accounts": [
      {
        "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
      }
    ],
    "nodes": [

    ],
    "created_date": "2023-10-13T14:19:22.933635+00:00"
  },
  {
    "display_name": "Scroll Sepolia",
    "internal_name": "SCROLL_SEPOLIA",
    "native_currency": "ETH",
    "is_testnet": true,
    "is_featured": false,
    "average_completion_time": "00:10:00",
    "chain_id": "534351",
    "status": "active",
    "type": "evm",
    "refuel_amount_in_usd": 1,
    "transaction_explorer_template": "https://sepolia.scrollscan.com/tx/{0}",
    "account_explorer_template": "https://sepolia.scrollscan.com/address/{0}",
    "currencies": [
      {
        "name": "USDC",
        "asset": "USDC",
        "contract_address": "0xF92fb426C8560145eF3e62e6eF35106d4D010fa7",
        "decimals": 6,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": false,
        "is_refuel_enabled": true,
        "max_withdrawal_amount": 500,
        "deposit_fee": 0,
        "withdrawal_fee": 0,
        "source_base_fee": 0,
        "destination_base_fee": 0
      },
      {
        "name": "ETH",
        "asset": "ETH",
        "contract_address": null,
        "decimals": 18,
        "status": "active",
        "is_deposit_enabled": true,
        "is_withdrawal_enabled": false,
        "is_refuel_enabled": false,
        "max_withdrawal_amount": 1,
        "deposit_fee": 0.00085,
        "withdrawal_fee": 0,
        "source_base_fee": 0.00085,
        "destination_base_fee": 0.00085
      }
    ],
    "metadata": {
      "multicall3": {
        "address": "0xca11bde05977b3631167028862be2a173976ca11",
        "blockCreated": 9473
      }
    },
    "managed_accounts": [
      {
        "address": "0x5dA5C2a98e26FD28914b91212b1232D58eb9bbab"
      }
    ],
    "nodes": [
      {
        "url": "https://scroll-sepolia.blockpi.network/v1/rpc/public\t"
      }
    ],
    "created_date": "2023-10-24T16:15:51.576769+00:00"
  }
]