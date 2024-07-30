import { FC, useEffect, useState } from 'react'
import { Widget } from '../Widget/Index';
import SubmitButton from '../buttons/submitButton';
import { useSettingsState } from '../../context/settings';
import { useRouter } from 'next/router';
import useWallet from '../../hooks/useWallet';
import { Commit, AssetLock } from '../../Models/PHTLC';
import { ethers } from 'ethers';
import Steps from './StepsComponent';
import { ProgressStatus, StatusStep } from './Withdraw/Processing/types';
import Image from "next/image";
import toast from 'react-hot-toast';
import { ExtendedAddress } from '../Input/Address/AddressPicker/AddressWithIcon';
import { addressFormat } from '../../lib/address/formatter';
import { truncateDecimals } from '../utils/RoundDecimals';
import { useTransaction } from 'wagmi';



type ContainerProps = {
    type: "widget" | "contained",
    children: JSX.Element | JSX.Element[] | undefined
}

type Props = ContainerProps & {
    // source: string;
    // destination: string;
    // amount: number;
    // address: string;
    // source_asseet: string;
    // destination_asset: string;
}


const SwapDetails: FC<Props> = (props) => {

    const {
        // address,
        // // amount,
        // destination,
        // source,
        // source_asseet,
        // destination_asset,
        type,
    } = props

    const { networks } = useSettingsState()
    const router = useRouter()
    const commitId = router.query.commitId
    const source_network = networks.find(n => n.name.toUpperCase() === (router.query.network as string)?.toUpperCase())
    const { getWithdrawalProvider } = useWallet()
    const [commitment, setCommitment] = useState<Commit | null>(null)
    const [destinationLock, setDestinationLock] = useState<AssetLock | null>(null)
    const [hashLock, setHashLock] = useState<string | null>(null)
    const [lockLoading, setLockLoading] = useState(false)
    const [lockTXhash, setLockTxhash] = useState<`0x${string}` | undefined>(undefined)

    const dest = "ARBITRUM_SEPOLIA"
    const dest_curr = "ETH"
    const destination_network = networks.find(n => n.name.toUpperCase() === (dest as string)?.toUpperCase())
    const destination_currency = destination_network?.tokens.find(t => t.symbol === dest_curr)
    const source_currency = source_network?.tokens.find(t => t.symbol === commitment?.srcAsset)

    const source_provider = source_network && getWithdrawalProvider(source_network)

    const amount = source_currency && commitment?.amount && Number(ethers.utils.formatUnits(commitment?.amount?.toString(), source_currency?.decimals))
    const requestedAmountInUsd = amount && (source_currency?.price_in_usd * amount).toFixed(2)

    const destinationLockedAmount = destination_currency && destinationLock?.amount && Number(ethers.utils.formatUnits(destinationLock?.amount?.toString(), destination_currency?.decimals))
    const destinationLocAmountInUSD = destinationLockedAmount && (destination_currency?.price_in_usd * destinationLockedAmount).toFixed(2)

    useEffect(() => {
        let commitHandler: any = undefined
        if (source_provider && source_network && commitId) {
            (async () => {
                commitHandler = setInterval(async () => {

                    if (!source_network.chain_id)
                        throw Error("No chain id")

                    const data = await source_provider.getCommitment({
                        chainId: source_network.chain_id,
                        commitId: commitId as string,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data && data.sender != '0x0000000000000000000000000000000000000000') {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 2000)
            })()
            return () => {
                commitHandler && clearInterval(commitHandler);
            };
        }
    }, [source_network, commitId])

    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider && destination_network && !destinationLock && commitment) {
            lockHandler = setInterval(async () => {
                if (!destination_network.chain_id)
                    throw Error("No chain id")

                const destinationLockId = await destination_provider.getLockIdByCommitId({
                    chainId: destination_network.chain_id,
                    commitId: commitId as string,
                    contractAddress: destination_network.metadata.htlc_contract as `0x${string}`
                })
                if (destinationLockId && destinationLockId != '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    setHashLock(destinationLockId)
                    const data = await destination_provider.getLock({
                        chainId: destination_network.chain_id,
                        lockId: destinationLockId as string,
                        contractAddress: destination_network.metadata.htlc_contract as `0x${string}`,
                    })
                    setDestinationLock(data)
                    clearInterval(lockHandler)
                }

            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
    }, [destination_provider, commitment, destination_network])

    const lockTrx = useTransaction({
        hash: lockTXhash,
        chainId: (Number(source_network?.chain_id) || undefined),
    })

    useEffect(() => {
        let commitHandler: any = undefined

        if (lockTrx.isSuccess && !commitment?.locked) {
            (async () => {

                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getCommitment({
                        chainId: source_network.chain_id,
                        commitId: commitId as string,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    setCommitment(data)
                    if (commitment?.locked) {
                        clearInterval(commitHandler)
                    }
                }, 2000)

            })()
        }
    }, [lockTrx, commitment, source_provider])


    useEffect(() => {
        let commitHandler: any = undefined
        if (commitment?.locked && destinationLock && !destinationLock?.redeemed) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_network?.chain_id)
                        throw Error("No chain id")
                    if (!destination_provider)
                        throw new Error("No source provider")
                    if (!hashLock)
                        throw new Error("No destination hashlock")
                    const data = await destination_provider.getLock({
                        chainId: destination_network.chain_id,
                        lockId: hashLock,
                        contractAddress: destination_network.metadata.htlc_contract as `0x${string}`,
                    })
                    setDestinationLock(data)
                    clearInterval(commitHandler)
                }, 2000)
            })()
        }
    }, [lockTrx, destination_network, commitment, hashLock])

    const handleLockAssets = async () => {
        try {
            setLockLoading(true)

            if (!source_network?.chain_id)
                throw Error("No chain id")
            if (!source_provider)
                throw new Error("No source provider")
            if (!hashLock)
                throw new Error("No destination hashlock")

            const { hash, result } = await source_provider.lockCommitment({
                chainId: source_network.chain_id,
                commitId: commitId as string,
                lockId: hashLock,
                contractAddress: source_network.metadata.htlc_contract as `0x${string}`
            })
            setLockTxhash(hash)

        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLockLoading(false)
        }
    }

    const progressStates: ProgressStates = {
        "commit": {
            upcoming: {
                name: 'Waiting for your committment',
                description: null
            },
            current: {
                name: 'Processing your committment',
                description: <div>
                    <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                        <div className='w-full grow'>
                            {
                                source_network &&
                                <div className="flex items-center justify-between w-full grow">
                                    <div className="flex items-center gap-3">
                                        <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                                        <div>
                                            <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                            <span>Detecting your commitment transaction</span>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            },
            complete: {
                name: `Your committment is confirmed`,
                description: <div>
                    <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                        <div className='w-full grow'>
                            {
                                commitment && source_network && amount && source_currency &&
                                <div className="flex items-center justify-between w-full grow">
                                    <div className="flex items-center gap-3">

                                        <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                                        <div>
                                            <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                            <div className="text-sm group/addressItem text-secondary-text">
                                                <ExtendedAddress address={addressFormat(commitment.sender, source_network)} network={source_network} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {
                                            <p className="text-primary-text text-sm">{truncateDecimals(amount, source_currency.precision)} {source_currency.symbol}</p>
                                        }
                                        <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            },
            failed: {
                name: `The transaction has failed`,
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-primary-text'>
                    </div>
                </div>
            }
        },
        "lp_lock": {
            upcoming: {
                name: `LP will lock assets`,
                description: <div>
                    <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                        <div className='w-full grow'>
                            {
                                commitment && destination_network && destination_currency &&
                                <div className="flex items-center justify-between w-full grow">
                                    <div className="flex items-center gap-3">

                                        <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                                        <div>
                                            <p className="text-primary-text text-sm leading-5">{destination_network?.display_name}</p>
                                            <div className="text-sm group/addressItem text-secondary-text">
                                                <ExtendedAddress address={addressFormat(commitment.sender, destination_network)} network={destination_network} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            },
            current: {
                name: `Waiting for LP to lock assets`,
                description: <div>
                    <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                        <div className='w-full grow'>
                            {
                                commitment && destination_network && destination_currency &&
                                <div className="flex items-center justify-between w-full grow">
                                    <div className="flex items-center gap-3">

                                        <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                                        <div>
                                            <p className="text-primary-text text-sm leading-5">{destination_network?.display_name}</p>
                                            <div className="text-sm group/addressItem text-secondary-text">
                                                Please wait for the LP to lock assets
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            },
            complete: {
                name: 'LP has locked assets',
                description: <div>
                    <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                        <div className='w-full grow'>
                            {
                                destinationLock && destination_network && destination_currency &&
                                <div className="flex items-center justify-between w-full grow">
                                    <div className="flex items-center gap-3">

                                        <Image src={destination_network.logo} alt={destination_network.display_name} width={32} height={32} className="rounded-lg" />
                                        <div>
                                            <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                            <div className="text-sm group/addressItem text-secondary-text">
                                                <ExtendedAddress address={addressFormat(destinationLock.sender, destination_network)} network={destination_network} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {destinationLockedAmount &&
                                            <p className="text-primary-text text-sm">{truncateDecimals(destinationLockedAmount, destination_currency.precision)} {destination_currency.symbol}</p>
                                        }
                                        <p className="text-secondary-text text-sm flex justify-end">${destinationLocAmountInUSD}</p>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            },
            failed: {
                name: "LP failed to lock assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>

                    </div>
                </div>
            }
        },
        "lock": {
            upcoming: {
                name: `Lock your assets in source network`,
                description: null
            },
            current: {
                name: `Please lock your assets in ${source_network?.display_name}`,
                description: <>
                    <div className='w-1/2'>
                        {
                            lockTXhash ?
                                <div className='text-sm'>Assets locked. Waiing for lock data to appear</div>
                                :
                                <SubmitButton size='small' onClick={handleLockAssets} isDisabled={lockLoading} isSubmitting={lockLoading}>
                                    Lock assets
                                </SubmitButton>
                        }
                    </div>
                </>
            },
            complete: {
                name: 'Assets are locked',
                description: <div className="flex flex-col">
                    <div className='flex items-center space-x-1'>
                        <div className='underline hover:no-underline flex items-center space-x-1'>
                            Your assets are safely locked
                        </div>
                    </div>
                </div>
            },
            failed: {
                name: "Failed to lock assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>

                    </div>
                </div>
            }
        },
        "redeem": {
            upcoming: {
                name: `Sending assets to your address`,
                description: null
            },
            current: {
                name: `Sending assets to your address`,
                description: null
            },
            complete: {
                name: `Assets were sent to your address`,
                description: <div className='flex items-center space-x-1'>

                </div>
            },
            failed: {
                name: "Failed to redeem assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>

                    </div>
                </div>
            }
        },
        "refund": {
            upcoming: {
                name: `Sending assets to your address`,
                description: null
            },
            current: {
                name: `Sending assets to your address`,
                description: null
            },
            complete: {
                name: `Assets were sent to your address`,
                description: <div className='flex items-center space-x-1'>

                </div>
            },
            failed: {
                name: "Failed to redeem assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>

                    </div>
                </div>
            }
        }
    }

    const progress = ResolveProgress({
        commited: !!commitment,
        lpLockDetected: destinationLock !== null,
        assetsLocked: !!commitment?.locked,
        redeemCompleted: !!destinationLock?.redeemed,
        refundCompleted: false,
        refundRequested: false
    })

    const allSteps: StatusStep[] = [
        {
            name: progressStates.commit?.[progress.stepStatuses?.commit]?.name,
            status: progress.stepStatuses.commit,
            description: progressStates?.commit?.[progress?.stepStatuses.commit]?.description,
            index: 1
        },
        {
            name: progressStates.lp_lock?.[progress.stepStatuses?.lp_lock]?.name,
            status: progress.stepStatuses.lp_lock,
            description: progressStates.lp_lock?.[progress.stepStatuses?.lp_lock]?.description,
            index: 2
        },
        {
            name: progressStates.lock?.[progress.stepStatuses?.lock]?.name,
            status: progress.stepStatuses.lock,
            description: progressStates?.lock?.[progress.stepStatuses?.lock]?.description,
            index: 3
        },
        {
            name: progressStates.redeem?.[progress.stepStatuses?.redeem]?.name,
            status: progress.stepStatuses.redeem,
            description: progressStates?.redeem?.[progress.stepStatuses?.redeem]?.description,
            index: 4
        }
    ]

    return (
        <>
            <Container type={type}>
                <>
                    <Widget.Content>
                        <div className="w-full flex flex-col justify-between  text-secondary-text">
                            <div className='grid grid-cols-1 gap-4 '>
                                {/* <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4"> */}
                                {/* {destination_network && commitment && destination_currency && source_network && source_currency &&
                                        <Summary
                                            destination={destination_network}
                                            destinationAddress={commitment.dstAddress}
                                            destinationCurrency={destination_currency}
                                            requestedAmount={Number(amount || 0)}
                                            source={source_network}
                                            sourceCurrency={source_currency}
                                            receiveAmount={undefined}
                                            exchange_account_connected={false}
                                            sourceAccountAddress={commitment.sender}
                                        />
                                    } */}
                                {/* <div>
                                        <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    {
                                                        commitment && source_network &&
                                                        <>
                                                            <Image src={source_network.logo} alt={source_network.display_name} width={32} height={32} className="rounded-lg" />
                                                            <div>
                                                                <p className="text-primary-text text-sm leading-5">{source_network?.display_name}</p>
                                                                <div className="text-sm group/addressItem text-secondary-text">
                                                                    <ExtendedAddress address={addressFormat(commitment.sender, source_network)} network={source_network} />
                                                                </div>
                                                            </div>
                                                        </>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div> */}






                                {/* </div> */}
                                <span>
                                    {
                                        <div className='flex flex-col h-full justify-center'>
                                            <Steps steps={allSteps} />
                                        </div>
                                    }
                                </span>
                            </div>
                        </div>
                    </Widget.Content>
                    {
                        <Widget.Footer sticky={true}>
                            <div>

                            </div>
                        </Widget.Footer>
                    }
                </>
            </Container>
        </>
    )
}

const Container = ({ type, children }: ContainerProps) => {

    if (type === "widget")
        return <Widget><>{children}</></Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
            {children}
        </div>

}

export type ProgressStates = {
    [key in Progress]?: {
        [key in ProgressStatus]?: {
            name?: string;
            description?: JSX.Element | string | null | undefined
        }
    }
}

export enum Progress {
    Commit = 'commit',
    LpLock = 'lp_lock',
    Lock = 'lock',
    Redeem = 'redeem',
    Refund = 'refund',
}

type ResolveProgressProps = {
    commited: boolean;
    lpLockDetected: boolean;
    assetsLocked: boolean;
    redeemCompleted: boolean;
    refundRequested: boolean;
    refundCompleted: boolean;
}

type ResolveProgressReturn = {
    stepStatuses: {
        [key in Progress]: ProgressStatus
    },
    generalStatus: {
        title: string,
        subTitle: string | null
    }
}

const ResolveProgress = (props: ResolveProgressProps): ResolveProgressReturn => {
    const {
        commited,
        assetsLocked,
        lpLockDetected,
        redeemCompleted,
        refundRequested,
        refundCompleted
    } = props

    if (refundCompleted) {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Complete,
                [Progress.Lock]: ProgressStatus.Complete,
                [Progress.Redeem]: ProgressStatus.Complete,
                [Progress.Refund]: ProgressStatus.Complete,
            },
            generalStatus: {
                title: "Swap refunded",
                subTitle: null
            }
        }
    }
    else if (refundRequested) {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Complete,
                [Progress.Lock]: ProgressStatus.Complete,
                [Progress.Redeem]: ProgressStatus.Complete,
                [Progress.Refund]: ProgressStatus.Current,
            },
            generalStatus: {
                title: "Refund requested",
                subTitle: null
            }
        }
    }
    else if (redeemCompleted) {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Complete,
                [Progress.Lock]: ProgressStatus.Complete,
                [Progress.Redeem]: ProgressStatus.Complete,
                [Progress.Refund]: ProgressStatus.Removed,
            },
            generalStatus: {
                title: "Swap completed",
                subTitle: null
            }
        }
    }
    else if (assetsLocked) {
        //TODO:fix this`
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Complete,
                [Progress.Lock]: ProgressStatus.Complete,
                [Progress.Redeem]: ProgressStatus.Current,
                [Progress.Refund]: ProgressStatus.Removed,
            },
            generalStatus: {
                title: "Waiting for redeem",
                subTitle: null
            }
        }
    }
    else if (lpLockDetected) {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Complete,
                [Progress.Lock]: ProgressStatus.Current,
                [Progress.Redeem]: ProgressStatus.Upcoming,
                [Progress.Refund]: ProgressStatus.Removed,
            },
            generalStatus: {
                title: "Please lock your assets",
                subTitle: null
            }
        }
    }
    else if (commited) {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Complete,
                [Progress.LpLock]: ProgressStatus.Current,
                [Progress.Lock]: ProgressStatus.Upcoming,
                [Progress.Redeem]: ProgressStatus.Upcoming,
                [Progress.Refund]: ProgressStatus.Removed,
            },
            generalStatus: {
                title: "Please lock your assets",
                subTitle: null
            }
        }
    }
    else {
        return {
            stepStatuses: {
                [Progress.Commit]: ProgressStatus.Current,
                [Progress.LpLock]: ProgressStatus.Upcoming,
                [Progress.Lock]: ProgressStatus.Upcoming,
                [Progress.Redeem]: ProgressStatus.Upcoming,
                [Progress.Refund]: ProgressStatus.Removed,
            },
            generalStatus: {
                title: "Waiting for LP to lock assets",
                subTitle: null
            }
        }
    }


}


export default SwapDetails