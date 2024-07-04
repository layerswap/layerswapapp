import { ArrowLeftRight, WalletIcon } from 'lucide-react';
import { FC, useCallback, useMemo, useState } from 'react'
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from '../WalletTransfer/buttons';
import useWallet from '../../../../../hooks/useWallet';
import { WithdrawPageProps } from '../WalletTransferContent';
import * as Paradex from "./lib";
import { TypedData } from '@paradex/sdk/dist/ethereum-signer';
import { useAccount } from 'wagmi';
import { useSettingsState } from '../../../../../context/settings';
import KnownInternalNames from '../../../../../lib/knownIds';
import { useSwapTransactionStore } from '../../../../../stores/swapTransactionStore';
import { BackendTransactionStatus } from '../../../../../lib/layerSwapApiClient';
import { useEthersSigner } from '../../../../../lib/ethersToViem/ethers';
import toast from 'react-hot-toast';
import SubmitButton from '../../../../buttons/submitButton';
import * as Starknet from 'starknet';
import { Call } from 'starknet';
import { BigNumber, ethers } from 'ethers';

const StarknetComponent: FC<WithdrawPageProps> = ({ amount, token, callData, swapId }) => {

    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()

    const { networks } = useSettingsState();
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);

    const { setSwapTransaction } = useSwapTransactionStore();

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return starknet && getProvider(starknet)
    }, [starknet, getProvider])
    const wallet = provider?.getConnectedWallet()




    const handleTransfer = useCallback(async () => {
        if (!swapId || !token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("Starknet wallet not connected")
            }

            if (amount == undefined && !amount)
                throw Error("No amount")

            try {
                const config = await Paradex.Config.fetchConfig(process.env.NEXT_PUBLIC_API_VERSION === "sandbox" ? 'testnet' : 'prod'); ///TODO: check environemnt may be mainnet

                const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

                const snAccount = wallet?.metadata?.starknetAccount?.account

                const paradexAccount = await Paradex.Account.fromStarknetAccount({
                    provider: paraclearProvider,
                    config,
                    account: snAccount,
                });

                const increaseAllowanceCall: Call[] =
                    [{
                        contractAddress: config.bridgedTokens[token.symbol].l2TokenAddress,
                        entrypoint: 'increaseAllowance',
                        calldata: [config.paraclearAddress, ethers.utils.parseUnits(amount.toString(), config.bridgedTokens[token.symbol].decimals)]
                    }];

                const parsedCallData = JSON.parse(callData || "")

                const res = await paradexAccount.execute([...increaseAllowanceCall, ...parsedCallData], undefined, { maxFee: '1000000000000000' });

                if (res.transaction_hash) {
                    setSwapTransaction(swapId, BackendTransactionStatus.Pending, res.transaction_hash);
                }
            }
            catch (e) {
                toast(e.message)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [wallet, swapId, starknet, token, callData, amount])


    return (
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
            {
                wallet &&
                <div className="flex flex-row
                    text-primary-text text-base space-x-2">
                    <SubmitButton
                        isDisabled={!!(loading || transferDone || !callData)}
                        isSubmitting={!!(loading || transferDone)}
                        onClick={handleTransfer}
                        icon={
                            <WalletIcon
                                className="h-6 w-6 stroke-2"
                                aria-hidden="true"
                            />
                        } >
                        Send from Starknet wallet
                    </SubmitButton>
                </div>
            }
        </div >
    )
}
export default StarknetComponent;