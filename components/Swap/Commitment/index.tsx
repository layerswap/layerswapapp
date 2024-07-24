import { FC, useEffect, useMemo, useState } from "react";
import { Widget } from "../../Widget/Index";
import { ProgressStatus, StatusStep } from "../Withdraw/Processing/types";
import { User } from "lucide-react";
import { UserCommitCurrent, UserCommitDone } from "./UserCommit";
import { LpLockCurrent, LpLockDone, LpLockUpcoming } from "./LpLock";
import { useSettingsState } from "../../../context/settings";
import { NextRouter, useRouter } from "next/router";
import { Network } from "../../../Models/Network";
import useWallet from "../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../Atomic";
import { AssetLock, Commit } from "../../../Models/PHTLC";
import Steps from "../StepsComponent";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import { UserLockCurrent, UserLockDone, UserLockUpcoming } from "./UserLock";

type ContainerProps = {
    type: "widget" | "contained",
    source: string;
    destination: string;
    amount: number;
    address: string;
    source_asseet: string;
    destination_asset: string;
}

type Props = ContainerProps & {

}

//TODO: implement user redeem current for handling LP did not redeem case
//TODO: implement refund]

const Commitment: FC<Props> = (props) => {
    const { source, destination, amount, address, source_asseet, destination_asset, type } = props;
    const router = useRouter()
    const [commitId, setCommitId] = useState<string | null>(router.query.commitId as string | null)
    const { networks } = useSettingsState()
    const [commitment, setCommitment] = useState<Commit | undefined>(undefined)
    const [destinationLock, setDestinationLock] = useState<AssetLock | null>(null)
    const [hashLock, setHashLock] = useState<string | null>(null)
    const [userLocked, setUserLocked] = useState<boolean>(false)

    const source_network = networks.find(n => n.name.toUpperCase() === source.toUpperCase())
    const destination_network = networks.find(n => n.name.toUpperCase() === destination.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asseet)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const handleCommited = (commitId: string) => {
        setCommitId(commitId)
        router.push({
            pathname: router.pathname,
            query: { ...router.query, commitId }
        }, undefined, { shallow: true })
    }

    const progressStates: ProgressStates = {
        "commit": {
            current: {
                name: 'Please commit assets to continue',
                hasSpinner: !!commitId,
                description: source_network && <UserCommitCurrent
                    address={address}
                    amount={amount}
                    source_asset={source_token}
                    destination_asset={destination_token}
                    source_network={source_network}
                    destination_network={destination_network}
                    onCommit={handleCommited}
                    setCommitment={setCommitment}
                    commitId={commitId}
                />
            },
            complete: {
                name: `Your committment is confirmed`,
                description: commitId ? <UserCommitDone
                    amount={amount}
                    source_asset={source_token}
                    source_network={source_network}
                    commitment={commitment}
                />
                    :
                    <></>
            },
            failed: {
                name: `The transaction has failed`,
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-primary-text'>
                        TODO: implement this
                    </div>
                </div>
            }
        },
        "lp_lock": {
            upcoming: {
                name: `Layerswap will lock assets after your commitment`,
                description: source_token && destination_token && source_network && destination_network && <LpLockUpcoming
                    address={address}
                    amount={amount}
                    source_asset={source_token}
                    destination_asset={destination_token}
                    source_network={source_network}
                    destination_network={destination_network}
                />
            },
            current: {
                name: `Layerswap is locking assets`,
                hasSpinner: true,
                description: source_token && destination_token && source_network && destination_network && commitment && commitId && <LpLockCurrent
                    address={address}
                    amount={amount}
                    source_asset={source_token}
                    destination_asset={destination_token}
                    source_network={source_network}
                    destination_network={destination_network}
                    commitment={commitment}
                    commitmentId={commitId}
                    destinationLock={destinationLock}
                    setDestinationLock={setDestinationLock}
                    setHashLock={setHashLock}
                />
            },
            complete: {
                name: 'LP has locked assets',
                description: source_token && destination_token && source_network && destination_network && destinationLock && <LpLockDone
                    address={address}
                    amount={amount}
                    source_asset={source_token}
                    destination_asset={destination_token}
                    source_network={source_network}
                    destination_network={destination_network}
                    destinationLock={destinationLock}
                />
            },
            failed: {
                name: "LP failed to lock assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>
                        TODO: implement lp_lock failed
                    </div>
                </div>
            }
        },
        "lock": {
            upcoming: {
                name: `Lock your assets in source network`,
                description: source_token && source_network && <UserLockUpcoming
                    amount={amount}
                    source_asset={source_token}
                    source_network={source_network}
                    commit={commitment}
                />
            },
            current: {
                name: `Please lock your assets in ${source_network?.display_name}`,
                hasSpinner: userLocked,
                description: commitment && commitId && source_token && source_network && hashLock && <UserLockCurrent
                    commit={commitment}
                    commitId={commitId}
                    hashLock={hashLock}
                    source_asset={source_token}
                    source_network={source_network}
                    setCommitment={setCommitment}
                    locked={userLocked}
                    setLocked={setUserLocked}
                />
            },
            complete: {
                name: 'Assets are locked',
                description: source_token && source_network && <UserLockDone
                    amount={amount}
                    source_asset={source_token}
                    source_network={source_network}
                    commit={commitment}
                />
            },
            failed: {
                name: "Failed to lock assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>
                        TODO: implement lock failed
                    </div>
                </div>
            }
        },
        "redeem": {
            upcoming: {
                name: `Sending assets to your address`,
                description: <RedeemUpcoming />
            },
            current: {
                name: `Sending assets to your address`,
                description: <RedeemCurrent />
            },
            complete: {
                name: `Assets were sent to your address`,
                description: <RedeemDone />
            },
            failed: {
                name: "Failed to redeem assets",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-secondary-text'>
                        TODO: implement redeem failed
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
    // const progress = ResolveProgress({
    //     commited: false,
    //     lpLockDetected: false,
    //     assetsLocked: false,
    //     redeemCompleted: false,
    //     refundCompleted: false,
    //     refundRequested: false
    // })

    const progress = ResolveProgress({
        commited: commitment ? true : false,
        lpLockDetected: destinationLock ? true : false,
        assetsLocked: commitment?.locked ? true : false,
        redeemCompleted: false,
        refundCompleted: false,
        refundRequested: false
    })

    const allSteps: StatusStep[] = [
        {
            name: progressStates.commit?.[progress.stepStatuses?.commit]?.name,
            status: progress.stepStatuses.commit,
            description: progressStates?.commit?.[progress?.stepStatuses.commit]?.description,
            hasSpinner: progressStates.commit?.[progress.stepStatuses?.commit]?.hasSpinner,
            index: 1
        },
        {
            name: progressStates.lp_lock?.[progress.stepStatuses?.lp_lock]?.name,
            status: progress.stepStatuses.lp_lock,
            description: progressStates.lp_lock?.[progress.stepStatuses?.lp_lock]?.description,
            hasSpinner: progressStates.lp_lock?.[progress.stepStatuses?.lp_lock]?.hasSpinner,
            index: 2
        },
        {
            name: progressStates.lock?.[progress.stepStatuses?.lock]?.name,
            status: progress.stepStatuses.lock,
            description: progressStates?.lock?.[progress.stepStatuses?.lock]?.description,
            hasSpinner: progressStates.lock?.[progress.stepStatuses?.lock]?.hasSpinner,
            index: 3
        },
        {
            name: progressStates.redeem?.[progress.stepStatuses?.redeem]?.name,
            status: progress.stepStatuses.redeem,
            description: progressStates?.redeem?.[progress.stepStatuses?.redeem]?.description,
            hasSpinner: true,
            index: 4
        }
    ]
    return (
        <>
            <>
                <Widget.Content>
                    <div className="w-full flex flex-col justify-between  text-secondary-text">
                        <div className='grid grid-cols-1 gap-4 '>
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
        </>
    )
}

const Container: FC<ContainerProps> = (props) => {
    const { type } = props

    if (type === "widget")
        return <Widget>
            <Commitment {...props} />
        </Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
            <Commitment {...props} />
        </div>

}

const useCommitmentPolling = (network: Network | undefined, commitmentId: string, onSuccess?: (data: Commit | null, intervalhandler: any) => void) => {
    const { getWithdrawalProvider } = useWallet()
    const source_provider = network && getWithdrawalProvider(network)
    const [commitment, setCommitment] = useState<Commit | null>(null)

    useEffect(() => {
        let commitHandler: any = undefined
        commitHandler = setInterval((async () => {
            if (source_provider) {
                const details = NETWORKS_DETAILS[network.name]

                if (!network.chain_id)
                    throw Error("No chain id")

                const data = await source_provider.getCommitment({
                    abi: details.abi,
                    chainId: network.chain_id,
                    commitId: commitmentId as string,
                    contractAddress: network.metadata.htlc_contract as `0x${string}`
                })

                if (data?.sender && data.sender != '0x0000000000000000000000000000000000000000') {
                    setCommitment(data)
                }
                if (onSuccess) {
                    onSuccess(data, commitHandler)
                }
                else {
                    clearInterval(commitHandler)
                }
            }
        }), 5000)
        return () => {
            clearInterval(commitHandler)
        }
    }, [source_provider])

    return { commitment }
}


export type ProgressStates = {
    [key in Progress]?: {
        [key in ProgressStatus]?: {
            name?: string;
            description?: JSX.Element | string | null | undefined,
            hasSpinner?: boolean
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
                title: "Waiting for LP to lock assets",
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
                title: "Please lock your assets",
                subTitle: null
            }
        }
    }
}

const RedeemUpcoming = () => {
    return <></>
}

const RedeemCurrent = () => {
    return <></>
}

const RedeemDone = () => {
    return <></>
}

export default Container