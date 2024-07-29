import { FC } from "react";
import { ProgressStatus } from "../Withdraw/Processing/types";
import Message from "./Message";
import AddressIcon from "../../AddressIcon";
import LayerSwapLogoSmall from "../../icons/layerSwapLogoSmall";
import { UserCommitAction, UserLockAction, UserRefundAction } from "./Actions/UserActions";
import { useAtomicState } from "../../../context/atomicContext";
import { motion, useAnimation } from "framer-motion";
import { LpLockingAssets } from "./Actions/LpLock";
import { RedeemAction } from "./Actions/Redeem";
import ActionStatus from "./Actions/ActionStatus";
import useWallet from "../../../hooks/useWallet";

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

const Committed = ({ address }: { address: string | undefined }) => <Message
    title="Committed"
    description="You committedd assets on the source network"
    isLast={true}
    source="from"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>
const LPIsLocking = () => <Message
    title="Locking assets"
    isLast={true}
    source="to"
    sourceIcon={<LayerSwapLogoSmall className="w-4 h-4" />}
/>
const AssetsLockedByLP = () => <Message
    title="Assets locked"
    description="We locked assets on the destination network"
    isLast={true}
    source="to"
    sourceIcon={<LayerSwapLogoSmall className="w-4 h-4" />}
/>
const AssetsLockedByUser = ({ address }: { address: string | undefined }) => <Message
    title="Assets locked"
    description="You locked assets on the source network"
    isLast={true}
    source="from"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>
const AssetsSent = () => <Message
    title="Assets sent"
    description="Your assets are sent to the destination address. Thank you for using LayerSwap"
    isLast={true}
    source="to"
    sourceIcon={<LayerSwapLogoSmall className="w-4 h-4" />}
/>
const LpPlng = () => <Message
    title={<div className="flex space-x-1 font-bold">
        <div className="animate-bounce delay-100">.</div>
        <div className="animate-bounce delay-150">.</div>
        <div className="animate-bounce delay-300">.</div>
    </div>}
    isLast={true}
    source="to"
    sourceIcon={<LayerSwapLogoSmall className="w-4 h-4" />}
/>

const UserCommitting = ({ address }: { address: string | undefined }) => <Message
    title={<div className="flex">
        Committing
    </div>}
    isLast={true}
    source="from"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>

//animate-bounce
export const ResolveMessages: FC = (props) => {

    const { committment, destinationLock, sourceLock, commitId, source_network } = useAtomicState()
    const commtting = commitId ? true : false;
    const commited = committment ? true : false;
    const lpLockDetected = destinationLock ? true : false;
    const assetsLocked = committment?.locked && destinationLock ? true : false;
    const redeemCompleted = sourceLock?.redeemed ? true : false;
    const isTimelockExpired = (Math.floor(Date.now() / 1000) - Number(committment?.timelock)) > 0
    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const address = committment?.sender || wallet?.address

    if (redeemCompleted) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed address={address} />
            <AssetsLockedByLP />
            <AssetsLockedByUser address={address} />
            <AssetsSent />
        </div>
    }
    //Implement refund UI
    if (isTimelockExpired) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed address={address} />
        </div>
    }
    if (assetsLocked) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed address={address} />
            <AssetsLockedByLP />
            <AssetsLockedByUser address={address} />
            <LpPlng />
        </div>
    }
    if (lpLockDetected) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed address={address} />
            <AssetsLockedByLP />
        </div>
    }
    if (commited) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed address={address} />
            <LpPlng />
        </div>
    }
    if (commtting) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <UserCommitting address={address} />
        </div>
    }
    return <></>
}
const ResolveAction: FC = () => {
    const { committment, destinationLock, sourceLock } = useAtomicState()

    const commited = committment ? true : false;
    const lpLockDetected = destinationLock ? true : false;
    const assetsLocked = committment?.locked && destinationLock ? true : false;
    const redeemCompleted = sourceLock?.redeemed ? true : false;
    const isTimelockExpired = (Math.floor(Date.now() / 1000) - Number(committment?.timelock)) > 0

    if (redeemCompleted) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <ActionStatus
                status="success"
                title='Transaction Completed'
            />
        </div>
    }
    if (isTimelockExpired) {
        if (committment?.uncommitted || destinationLock?.unlocked) {
            return <div className="flex w-full grow flex-col space-y-2" >
                <ActionStatus
                    status="success"
                    title='Refund Completed'
                />
            </div>
        }
        else {
            return <div className="flex w-full grow flex-col space-y-2" >
                <UserRefundAction />
            </div>
        }
    }
    if (assetsLocked) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <RedeemAction />
        </div>
    }
    if (lpLockDetected) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <UserLockAction />
        </div>
    }
    if (commited) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <LpLockingAssets />
        </div>
    }
    return <div className="flex w-full grow flex-col space-y-2" >
        <UserCommitAction />
    </div>
}


export const ActionsWithProgressbar: FC = () => {
    const { committment } = useAtomicState()

    const firstStep = committment ? "100%" : "5%"
    const secondStep = committment?.locked ? "100%" : (committment ? "10%" : "0")

    const currentStep = committment ? 2 : 1
    const allDone = committment?.locked ? true : false


    return <div className="space-y-4">
        {
            !allDone &&
            <div className="space-y-1 relative">
                {
                    allDone ?
                        <div className="text-secondary-text text-xs">
                            Complited
                        </div>
                        :
                        <div className="text-secondary-text text-xs">
                            Step <>{currentStep}</>/2 - <>{committment ? 'Lock' : 'Commit'}</>
                        </div>
                }
                <div className="flex space-x-1">
                    <div className="w-full relative">
                        <div className="h-1 w-full bg-secondary-600 rounded-md"></div>
                        <motion.div
                            className="h-1 absolute bg-primary rounded-md top-0"
                            animate={{ width: firstStep }}
                            initial={{ width: "0" }}
                        />
                    </div>
                    <div className="w-full relative">
                        <div className="h-1 w-full bg-secondary-600 rounded-md"></div>
                        <motion.div
                            className="h-1 absolute bg-primary rounded-md top-0"
                            animate={{ width: secondStep }}
                            initial={{ width: "0" }}
                        />
                    </div>
                </div>
            </div>
        }
        <ResolveAction />
    </div>
}