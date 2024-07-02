import KnownInternalNames from "../../knownIds"
import Erc20Abi from '../../abis/ERC20.json'
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, GasProps, NetworkBalancesProps } from "../../../Models/Balance";
import { useRouter } from "next/router";
import { ApiResponse } from "../../../Models/ApiResponse";
import { EstimateFee } from "starknet";
import InternalApiClient from "../../internalApiClient";
import { useSettingsState } from "../../../context/settings";

export default function useStarknetBalance(): BalanceProvider {

    const { networks } = useSettingsState()

    const supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia,
    ]
    const router = useRouter()

    const getNetworkBalances = async ({ networkName, address }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === networkName)

        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (!network?.tokens) return

        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]

                const erc20 = new Contract(Erc20Abi, token.contract!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: network.name,
                    token: token.symbol,
                    amount: formatAmount(balanceInWei, token.decimals),
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                }

                balances = [
                    ...balances,
                    balance
                ]
            }
            catch (e) {
                console.log(e)
            }
        }

        return balances

    }


    const getBalance = async ({ network, token, address }: BalanceProps) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        try {

            const erc20 = new Contract(Erc20Abi, token.contract!, provider);
            const balanceResult = await erc20.balanceOf(address);
            const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

            return {
                network: network.name,
                token: token.symbol,
                amount: formatAmount(balanceInWei, token.decimals),
                request_time: new Date().toJSON(),
                decimals: token.decimals,
                isNativeCurrency: false,
            }

        }
        catch (e) {
            console.log(e)
        }

    }

    const getGas = async ({ network, token, wallet }: GasProps) => {

        const nodeUrl = network.node_url
        const contract_address = token?.contract
        const testnetWatchdog = '0x0423074c4bf903478daaa719bb3b1539d23af07db07101d263c78d75e5e6e0a3'
        const mainnetWatchdog = '0x022993789c33e54e0d296fc266a9c9a2e9dcabe2e48941f5fa1bd5692ac4a8c4'
        const mainnetRecipient = '0x19252B1dEef483477C4D30cFcc3e5Ed9C82FAFEA44669c182A45A01b4FdB97a'
        const testnetRecipient = '0x065a93bf9a33c87346f534a3b6c825e5c9e86a8e612cba683d0271aae5062d21'
        const version = (network.name.split('_').pop() === 'SEPOLIA' || network.name.split('_').pop() === 'GOERLI') ? 'sandbox' : 'prod'

        const recipient = version === 'prod' ? mainnetRecipient : testnetRecipient
        const watchdogContract = version === 'prod' ? mainnetWatchdog : testnetWatchdog

        if (!token || !network.token) return

        const client = new InternalApiClient()
        const basePath = router.basePath ?? '/'
        const feeEstimateResponse: ApiResponse<EstimateFee> = await client.GetStarknetFee(`nodeUrl=${nodeUrl}&walletAddress=${wallet?.address}&contractAddress=${contract_address}&recipient=${recipient}&watchDogContract=${watchdogContract}`, basePath)

        if (!feeEstimateResponse?.data?.suggestedMaxFee) {
            throw new Error(`Couldn't get fee estimation for the transfer. Response: ${JSON.stringify(feeEstimateResponse)}`);
        };

        const feeInWei = feeEstimateResponse.data.suggestedMaxFee.toString();

        const gas = {
            token: token.symbol,
            gas: formatAmount(feeInWei, network.token.decimals),
            request_time: new Date().toJSON()
        }

        return [gas]

    }

    return {
        getNetworkBalances,
        getBalance,
        getGas,
        supportedNetworks
    }
}