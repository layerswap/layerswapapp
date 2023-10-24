import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import { connect, disconnect } from "get-starknet"
import { Contract, number, uint256 } from 'starknet';
import Erc20Abi from "../../../../lib/abis/ERC20.json"
import WatchDogAbi from "../../../../lib/abis/LSWATCHDOG.json"
import { useAuthState } from '../../../../context/authContext';
import KnownInternalNames from '../../../../lib/knownIds';
import { useWalletState, useWalletUpdate } from '../../../../context/wallet';
import { parseUnits } from 'viem'

type Props = {
    depositAddress?: string;
    amount?: number
}

function getUint256CalldataFromBN(bn: number.BigNumberish) {
    return { type: "struct" as const, ...uint256.bnToUint256(bn) }
}
export function parseInputAmountToUint256(
    input: string,
    decimals: number = 18,
) {
    return getUint256CalldataFromBN(parseUnits(input, decimals).toString())
}

const StarknetWalletWithdrawStep: FC<Props> = ({ depositAddress, amount }) => {

    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { setStarknetAccount } = useWalletUpdate()
    const { starknetAccount } = useWalletState()
    const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>()

    const { userId } = useAuthState()

    const { swap } = useSwapDataState()
    const { setSwapPublishedTx } = useSwapDataUpdate()
    const { networks } = useSettingsState()

    const { source_network: source_network_internal_name } = swap || {}
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const sourceCurrency = source_network?.currencies.find(c => c.asset?.toLowerCase() === swap?.source_network_asset?.toLowerCase())

    const sourceChainId = source_network?.chain_id

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            const res = await connect()
            const connectedChainId = res?.account?.chainId
            if (connectedChainId && connectedChainId !== sourceChainId) {
                setIsWrongNetwork(true)
                disconnect()
            }
            else {
                setIsWrongNetwork(false)
                setStarknetAccount(res)
            }
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [sourceChainId])

    const handleTransfer = useCallback(async () => {
        if (!process.env.NEXT_PUBLIC_WATCHDOG_CONTRACT)
            throw new Error("Watchdog contract not configured")
        if (!swap || !sourceCurrency) {
            return
        }
        setLoading(true)
        try {
            if (!starknetAccount) {
                throw Error("starknet wallet not connected")
            }
            if(!sourceCurrency.contract_address){
                throw Error("starknet contract_address is not defined")
            }
            if(!source_network?.metadata?.WatchdogContractAddress){
                throw Error("WatchdogContractAddress is not defined on network metadata")
            }
            if(!amount){
                throw Error("amount is not defined for starknet transfer")
            }
            const erc20Contract = new Contract(
                Erc20Abi,
                sourceCurrency.contract_address,
                starknetAccount.account,
            )

            const watchDogContract = new Contract(
                WatchDogAbi,
                source_network.metadata.WatchdogContractAddress,
                starknetAccount.account,
            )

            const call = erc20Contract.populate(
                "transfer",
                [depositAddress,
                    parseInputAmountToUint256(amount.toString(), sourceCurrency?.decimals)]
                ,
            );

            const watch = watchDogContract.populate(
                "watch",
                [swap.sequence_number],
            );

            try {

                const { transaction_hash: transferTxHash } = (await starknetAccount.account?.execute([call, watch]) || {});
                if (transferTxHash) {
                    setSwapPublishedTx(swap.id, PublishedSwapTransactionStatus.Completed, transferTxHash);
                    setTransferDone(true)
                }
                else {
                    toast('Transfer failed or terminated')
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
    }, [starknetAccount, swap, source_network, depositAddress, userId, sourceCurrency])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    {

                        isWrongNetwork &&
                        <WarningMessage messageType='warning'>
                            <span className='flex'>
                                {
                                    source_network_internal_name === KnownInternalNames.Networks.StarkNetMainnet
                                        ? <span>Please switch to Starknet Mainnet with your wallet and click Connect again</span>
                                        : <span>Please switch to Starknet Goerli with your wallet and click Connect again</span>
                                }
                            </span>
                        </WarningMessage>
                    }
                    {
                        !starknetAccount &&
                        <div className="flex flex-row
                         text-primary-text text-base space-x-2">
                            <SubmitButton
                                isDisabled={loading}
                                isSubmitting={loading}
                                onClick={handleConnect}
                                icon={
                                    <Link
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true"
                                    />
                                } >
                                Connect wallet
                            </SubmitButton>
                        </div>
                    }
                    {
                        starknetAccount
                        && depositAddress
                        && !isWrongNetwork
                        && <div className="flex flex-row
                        text-primary-text text-base space-x-2">
                            <SubmitButton
                                isDisabled={!!(loading || transferDone)}
                                isSubmitting={!!(loading || transferDone)}
                                onClick={handleTransfer}
                                icon={
                                    <ArrowLeftRight
                                        className="h-5 w-5 ml-2"
                                        aria-hidden="true"
                                    />
                                } >
                                Send from wallet
                            </SubmitButton>
                        </div>
                    }
                </div>
            </div >
        </>
    )
}


export default StarknetWalletWithdrawStep;