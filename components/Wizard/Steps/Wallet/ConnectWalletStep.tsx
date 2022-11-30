import { CheckIcon, LinkIcon, SwitchHorizontalIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import ImtblClient from '../../../../lib/imtbl';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import { classNames } from '../../../utils/classNames';
import { useInterval } from '../../../../hooks/useInterval';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import shortenAddress from "../../../utils/ShortenAddress"
import { ApiError, KnownwErrorCode } from '../../../../Models/ApiError';


const ConnectWalletStep: FC = () => {
    const [loading, setLoading] = useState(false)
    const [verified, setVerified] = useState<boolean>()
    const [txidApplied, setTxidApplied] = useState(false)
    const [applyCount, setApplyCount] = useState(0)
    const [transactionId, setTransactionId] = useState<string>()
    const [transferDone, setTransferDone] = useState<boolean>()
    const { walletAddress, swap } = useSwapDataState()
    const { setWalletAddress } = useSwapDataUpdate()
    const { setInterval } = useSwapDataUpdate()
    const { networks, exchanges } = useSettingsState()
    const { goToStep, setError } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const network = swap && networks?.find(n => n.currencies.some(nc => nc.id === swap.network_currency_id))
    const exchange = swap && exchanges?.find(e => e.currencies.some(ec => ec.id === swap.exchange_currency_id))
    const asset = network && network.currencies.find(c => c.id === swap.network_currency_id)?.asset

    const steps = [
        { name: walletAddress ? `Connected to ${shortenAddress(walletAddress)}` : 'Connect wallet', description: 'Connect your ImmutableX wallet', href: '#', status: walletAddress ? 'complete' : 'current' },
        {
            name: verified ? 'Wallet is verified ' : 'Verify Wallet',
            description: "Verify that you are the owner of the connected wallet",
            href: '#',
            status: walletAddress ? (verified ? 'complete' : 'current') : 'upcoming',
        },
        { name: 'Transfer', description: "Initiate a transfer from your wallet to our address", href: '#', status: verified ? 'current' : 'upcoming' },
    ]

    const applyNetworkInput = useCallback(async () => {
        try {
            setApplyCount(old => old + 1)
            const layerSwapApiClient = new LayerSwapApiClient()
            await layerSwapApiClient.ApplyNetworkInput(swap.id, transactionId)
            setTxidApplied(true)
        }
        catch (e) {
            //TODO handle
        }
    }, [transactionId])

    useInterval(
        applyNetworkInput,
        transactionId && !txidApplied && applyCount < 10 ? 8000 : null,
    )

    useEffect(() => {
        return () => setInterval(0)
    }, [])

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep)
            goToStep(swapStatusStep)
    }, [swapStatusStep])

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            let address: string = walletAddress
            if (!address) {
                const imtblClient = new ImtblClient(network.internal_name)
                const res = await imtblClient.ConnectWallet()
                setWalletAddress(res.address)
                address = res.address
            }
            const layerSwapApiClient = new LayerSwapApiClient()
            const accounts = await layerSwapApiClient.GetNetworkAccounts(network.internal_name)
            if (accounts?.data?.some(a => a.address === address && a.is_verified))
                setVerified(true)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [network])

    const handleVerify = useCallback(async () => {
        setLoading(true)
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.Sign()
            const layerSwapApiClient = new LayerSwapApiClient()
            layerSwapApiClient.CreateNetworkAccount({ signature: res.result, address: walletAddress, network: network.internal_name, note: "" })
            setVerified(true)
        }
        catch (e) {
            const data: ApiError = e?.response?.data?.error
            if(data.code == KnownwErrorCode.NETWORK_ACCOUNT_ALREADY_EXISTS) {
                goToStep(SwapWithdrawalStep.Error)
                setError({ Code: data.code, Step: SwapWithdrawalStep.WalletConnect })
            }
            toast(e.message)
        }
        setLoading(false)
    }, [walletAddress, network])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.Transfer(swap.requested_amount.toString(), swap.additonal_data.deposit_address)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('Transfer failed or terminated')
            else if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes.status == "success") {
                setTransactionId(transactionRes.txId.toString())
                setTransferDone(true)
                setInterval(2000)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [walletAddress, swap, network])

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
                <WalletSteps steps={steps} />
                {
                    !walletAddress &&
                    <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<LinkIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Connect
                    </SubmitButton>
                }
                {
                    walletAddress && !verified &&
                    <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleVerify} icon={<CheckIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Verify wallet
                    </SubmitButton>
                }
                {
                    verified &&
                    <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<SwitchHorizontalIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Transfer
                    </SubmitButton>
                }

            </div>
        </>
    )
}

function WalletSteps({ steps }) {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={classNames(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
                        {step.status === 'complete' ? (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-primary" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start">
                                    <span className="flex h-9 items-center">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full  bg-primary">
                                            <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-gray-300">{step.name}</span>
                                        {/* <span className="text-sm text-primary-text">{step.description}</span> */}
                                    </span>
                                </div>
                            </>
                        ) : step.status === 'current' ? (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start" aria-current="step">
                                    <span className="flex h-9 items-center" aria-hidden="true">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-primary">{step.name}</span>
                                        <span className="text-sm text-primary-text">{step.description}</span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start">
                                    <span className="flex h-9 items-center" aria-hidden="true">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                                            <span className="h-2.5 w-2.5 rounded-full bg-transparent " />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-primary-text">{step.name}</span>
                                        <span className="text-sm text-primary-text">{step.description}</span>
                                    </span>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}

export default ConnectWalletStep;