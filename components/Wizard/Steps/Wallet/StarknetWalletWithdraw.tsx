import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import ImtblClient from '../../../../lib/imtbl';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import { useInterval } from '../../../../hooks/useInterval';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import shortenAddress from "../../../utils/ShortenAddress"
import { SwapStatus } from '../../../../Models/SwapStatus';
import Steps from '../StepsComponent';
import WarningMessage from '../../../WarningMessage';
import GuideLink from '../../../guideLink';
import { connect, disconnect } from "get-starknet"
import { AccountInterface, Contract, Abi, number, uint256 } from 'starknet';
import { utils } from "ethers"
import Erc20Abi from "../../../../lib/abis/ERC20.json"
import WatchDogAbi from "../../../../lib/abis/LSWATCHDOG.json"
import { ApiResponse } from '../../../../Models/ApiResponse';
import useSWR from 'swr';
import { useAuthState } from '../../../../context/authContext';


export const erc20TokenAddressByNetwork = {
    "goerli-alpha":
        "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "mainnet-alpha":
        "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
}

export const getErc20TokenAddress = (network: PublicNetwork) =>
    erc20TokenAddressByNetwork[network]

export type PublicNetwork = keyof typeof erc20TokenAddressByNetwork
function getUint256CalldataFromBN(bn: number.BigNumberish) {
    return { type: "struct" as const, ...uint256.bnToUint256(bn) }
}
export function parseInputAmountToUint256(
    input: string,
    decimals: number = 18,
) {
    return getUint256CalldataFromBN(utils.parseUnits(input, decimals).toString())
}


const StarknetWalletWithdrawStep: FC = () => {
    const [loading, setLoading] = useState(false)
    const [verified, setVerified] = useState<boolean>()
    const [txidApplied, setTxidApplied] = useState(false)
    const [applyCount, setApplyCount] = useState(0)
    const [transferDone, setTransferDone] = useState<boolean>()
    const [account, setAccount] = useState<AccountInterface>()
    const { userId } = useAuthState()

    const { swap } = useSwapDataState()
    const { setInterval } = useSwapDataUpdate()
    const { networks } = useSettingsState()
    const { goToStep, setError } = useFormWizardaUpdate<SwapWithdrawalStep>()

    const { source_network: source_network_internal_name } = swap
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const layerswapApiClient = new LayerSwapApiClient()

    const { data: managedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.Managed}`, layerswapApiClient.fetcher)

    const steps = [
        { name: account ? `Connected to ${shortenAddress(account.address)}` : 'Connect wallet', description: 'Connect your ImmutableX wallet', href: '#', status: account ? 'complete' : 'current' },
        { name: 'Transfer', description: "Initiate a transfer from your wallet to our address", href: '#', status: verified ? 'current' : 'upcoming' },
    ]

    useEffect(() => {
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swap.status != SwapStatus.UserTransferPending)
            goToStep(swapStatusStep)
    }, [swapStatusStep, swap])

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            if (!account) {
                const res = await connect()
                setAccount(res?.account)
            }
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [account])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            if (!account) {
                throw Error("starknet wallet not connected")
            }

            const erc20Contract = new Contract(
                Erc20Abi,
                getErc20TokenAddress('mainnet-alpha'),
                account,
            )

            const watchDogContract = new Contract(
                WatchDogAbi,
                "0x056b277d1044208632456902079f19370e0be63b1a4745f04f96c8c652237dbc",
                account,
            )

            var call = erc20Contract.populate(
                "transfer",
                [managedDeposit.data.address,
                parseInputAmountToUint256(swap.requested_amount.toString())]
                ,
            );

            var watch = watchDogContract.populate(
                "watch",
                [userId],
            );

            try {
                const {  transaction_hash: transferTxHash } = await account.execute([call, watch]);
                const layerSwapApiClient = new LayerSwapApiClient()
                await layerSwapApiClient.ApplyNetworkInput(swap.id, transferTxHash)
                if (transferTxHash) {
                    await account.waitForTransaction(transferTxHash);
                    setTxidApplied(true)
                }
                else {
                    toast('Transfer failed or terminated')
                }
            }
            catch (e) {
                toast(e.message)
            }

            // const imtblClient = new ImtblClient(source_network?.internal_name)
            // const source_currency = source_network.currencies.find(c => c.asset.toLocaleUpperCase() === swap.source_network_asset.toLocaleUpperCase())
            // const res = await imtblClient.Transfer(swap, source_currency)
            // const transactionRes = res?.result?.[0]
            // if (!transactionRes)
            //     toast('Transfer failed or terminated')
            // else if (transactionRes.status == "error") {
            //     toast(transactionRes.message)
            // }
            // else if (transactionRes.status == "success") {
            //     setTransactionId(transactionRes.txId.toString())
            //     setTransferDone(true)
            //     setInterval(2000)
            // }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [account, swap, source_network, managedDeposit, userId])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Complete the transfer
                        </h3>
                    </div>
                    <p className='leading-5'>
                        We’ll help you to send crypto from your ImmutableX wallet
                    </p>
                </div>
                <Steps steps={steps} />
                <div className='space-y-4'>
                    <WarningMessage messageType='informing'>
                        <span className='flex-none'>
                            Learn how to send from
                        </span>
                        <GuideLink text={source_network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex' />
                    </WarningMessage>
                    {
                        !account &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Connect
                        </SubmitButton>
                    }
                    {
                        account &&
                        <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default StarknetWalletWithdrawStep;