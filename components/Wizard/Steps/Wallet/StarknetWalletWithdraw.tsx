import { Link, ArrowLeftRight, UnlinkIcon } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
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
import NetworkSettings from '../../../../lib/NetworkSettings';
import KnownInternalNames from '../../../../lib/knownIds';

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
    const [transferDone, setTransferDone] = useState<boolean>()
    const [account, setAccount] = useState<AccountInterface>()
    const { userId } = useAuthState()

    const { swap } = useSwapDataState()
    const { mutateSwap } = useSwapDataUpdate()
    const { networks } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()

    const { source_network: source_network_internal_name } = swap
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const sourceCurrency = source_network.currencies.find(c => c.asset.toLowerCase() === swap.source_network_asset.toLowerCase())

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: managedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.Managed}`, layerswapApiClient.fetcher)
    const handleDisconnect = async () => {
        disconnect({ clearLastWallet: true })
        setAccount(null)
    }
    const steps = [
        {
            name: account ?
                <span className='flex '>
                    {`Connected to ${shortenAddress(account.address)}`}
                    <span onClick={handleDisconnect} className='cursor-pointer ml-1 mt-0.5 bg-darkblue-400 rounded-md'>
                        <UnlinkIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                </span>
                : <span>Connect wallet</span>,
            description: account ? 'Wallet connected' : 'Connect your wallet',
            href: '#',
            status: account ? 'complete' : 'current'
        },
        { name: 'Transfer', description: "Initiate a transfer from your wallet to our address", href: '#', status: account ? 'current' : 'upcoming' },
    ]

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
                sourceCurrency.contract_address,
                account,
            )

            const watchDogContract = new Contract(
                WatchDogAbi,
                process.env.NEXT_PUBLIC_WATCHDOG_CONTRACT,
                account,
            )

            const call = erc20Contract.populate(
                "transfer",
                [managedDeposit.data.address,
                parseInputAmountToUint256(swap.requested_amount.toString(), sourceCurrency.decimals)]
                ,
            );

            const watch = watchDogContract.populate(
                "watch",
                [userId],
            );

            try {
                const { transaction_hash: transferTxHash } = await account.execute([call, watch]);
                if (transferTxHash) {
                    const layerSwapApiClient = new LayerSwapApiClient()
                    await layerSwapApiClient.ApplyNetworkInput(swap.id, transferTxHash)
                    await mutateSwap()
                    goToStep(SwapWithdrawalStep.SwapProcessing)
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
    }, [account, swap, source_network, managedDeposit, userId, sourceCurrency])

    const sourceNetworkSettings = NetworkSettings.KnownSettings[source_network_internal_name]
    const sourceChainId = sourceNetworkSettings?.ChainId

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
                        We’ll help you to send crypto from your wallet
                    </p>
                </div>
                <Steps steps={steps} />
                <div className='space-y-4'>
                    {

                        account && sourceChainId !== account?.chainId &&
                        <WarningMessage messageType='warning'>
                            <span className='flex-none'>
                                {
                                    source_network_internal_name === KnownInternalNames.Networks.StarkNetMainnet
                                        ? <span>Please switch to Starknet Maionnet with your wallet</span>
                                        : <span>Please switch to Starknet Goerli with your wallet</span>
                                }
                            </span>
                        </WarningMessage>
                    }
                    {
                        !account &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Connect
                        </SubmitButton>
                    }
                    {
                        account
                        && managedDeposit?.data?.address
                        && sourceChainId === account?.chainId
                        && <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default StarknetWalletWithdrawStep;