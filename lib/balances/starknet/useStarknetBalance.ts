import KnownInternalNames from "../../knownIds"
import Erc20Abi from '../../abis/ERC20.json'
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, GasProps } from "../../../Models/Balance";

export default function useStarknetBalance(): BalanceProvider {
    const name = 'starknet'

    const supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli
    ]

    const getBalance = async ({ layer, address }: BalanceProps) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (!layer.assets) return

        const provider = new RpcProvider({
            nodeUrl: layer.nodes[0].url,
        });

        for (let i = 0; i < layer.assets.length; i++) {
            try {
                const asset = layer.assets[i]

                const erc20 = new Contract(Erc20Abi, asset.contract_address!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: layer.internal_name,
                    token: asset.asset,
                    amount: formatAmount(balanceInWei, asset.decimals),
                    request_time: new Date().toJSON(),
                    decimals: asset.decimals,
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

    const getGas = async ({ layer, currency, wallet }: GasProps) => {

        const { CallData,
            cairo,
            Account,
            SequencerProvider
        } = await import("starknet");

        const { BigNumber } = await import("ethers");

        if (!layer.assets) return

        const amountToWithdraw = BigNumber.from(1);
        const contract_address = layer.assets.find(a => a.asset === currency.asset)?.contract_address
        const asset = layer.assets.find(a => a.asset === currency.asset)
        const FEE_ESTIMATE_MULTIPLIER = BigInt(4);

        if (!contract_address || !asset || !wallet) return

        const provider = new SequencerProvider({
            baseUrl: 'https://alpha-mainnet.starknet.io',
        });

        const account = new Account(provider, wallet.address, wallet.metadata?.starknetAccount?.account.signer.pk);

        let transferCall = {
            contractAddress: contract_address.toLowerCase(),
            entrypoint: "transfer",
            calldata: CallData.compile(
                {
                    recipient: wallet.address,
                    amount: cairo.uint256(amountToWithdraw.toHexString())
                })
        };

        let feeEstimateResponse = await account.estimateFee(transferCall, { skipValidate: true });
        if (!feeEstimateResponse?.suggestedMaxFee) {
            throw new Error(`Couldn't get fee estimation for the transfer. Response: ${JSON.stringify(feeEstimateResponse)}`);
        };

        const feeInWei = (feeEstimateResponse.suggestedMaxFee * FEE_ESTIMATE_MULTIPLIER).toString();

        const gas = {
            token: currency.asset,
            gas: formatAmount(feeInWei, asset.decimals),
            request_time: new Date().toJSON()
        }

        return [gas]

    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}