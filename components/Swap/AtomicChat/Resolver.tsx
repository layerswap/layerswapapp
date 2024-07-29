import { FC } from "react";
import Message from "./Message";
import AddressIcon from "../../AddressIcon";
import { UserCommitAction, UserLockAction } from "./Actions/UserActions";
import { useAtomicState } from "../../../context/atomicContext";
import { motion } from "framer-motion";
import { LpLockingAssets } from "./Actions/LpLock";
import { RedeemAction } from "./Actions/Redeem";
import ActionStatus from "./Actions/ActionStatus";
import useWallet from "../../../hooks/useWallet";
import { ExternalLink } from "lucide-react";
import SubmitButton from "../../buttons/submitButton";

export enum Progress {
    Commit = 'commit',
    LpLock = 'lp_lock',
    Lock = 'lock',
    Redeem = 'redeem',
    Refund = 'refund',
}

const Committed = ({ walletIcon }: { walletIcon?: JSX.Element }) => <Message
    title="Committed"
    description="You committed assets on the source network"
    isLast={true}
    source="from"
    sourceIcon={walletIcon}
/>
const LPIsLocking = ({ address }: { address: string | undefined }) => <Message
    title="Locking assets"
    isLast={true}
    source="to"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>
const AssetsLockedByLP = ({ address }: { address: string | undefined }) => <Message
    title="LP Assets Locked"
    description="Liqudity provider locked funds for you"
    isLast={true}
    source="to"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>
const AssetsLockedByUser = ({ walletIcon }: { walletIcon?: JSX.Element }) => <Message
    title="Your Assets Locked"
    description="You locked assets on the source network"
    isLast={true}
    source="from"
    sourceIcon={walletIcon}
/>
const AssetsSent = ({ address }: { address: string | undefined }) => <Message
    title="Assets sent"
    description="Your assets are sent to the destination address"
    isLast={true}
    source="to"
    sourceIcon={address && <AddressIcon className="scale-150 h-3 w-3" address={address} size={12} />}
/>
const LpPlng = ({ address }: { address: string | undefined }) => <Message
    title={<div className="flex space-x-1 font-bold">
        <div className="animate-bounce delay-100">.</div>
        <div className="animate-bounce delay-150">.</div>
        <div className="animate-bounce delay-300">.</div>
    </div>}
    isLast={true}
    source="to"
    sourceIcon={address && <AddressIcon className="scale-150 h-4 w-4" address={address} size={12} />}
/>

const UserCommitting = ({ walletIcon }: { walletIcon?: JSX.Element }) => <Message
    title={<div className="flex">
        Committing your funds for bridging
    </div>}
    isLast={true}
    source="from"
    sourceIcon={walletIcon}
/>
const UserLocking = ({ walletIcon }: { walletIcon?: JSX.Element }) => <Message
    title={<div className="flex">
        Locking your funds for LP
    </div>}
    isLast={true}
    source="from"
    sourceIcon={walletIcon}
/>

//animate-bounce
export const ResolveMessages: FC = (props) => {

    const { committment, destinationLock, sourceLock, commitId, source_network, userLocked: userInitiatedLock } = useAtomicState()
    const commtting = commitId ? true : false;
    const commited = committment ? true : false;
    const lpLockDetected = destinationLock ? true : false;

    const assetsLocked = committment?.locked && destinationLock ? true : false;

    const redeemCompleted = sourceLock?.redeemed ? true : false;
    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const lp_address = source_network?.metadata.lp_address

    const WalletIcon = wallet && <wallet.icon className="w-5 h-5 rounded-full bg-secondary-800 border-secondary-400" />

    if (redeemCompleted) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed walletIcon={WalletIcon} />
            <AssetsLockedByLP address={lp_address} />
            <AssetsLockedByUser walletIcon={WalletIcon} />
            <AssetsSent address={lp_address} />
        </div >
    }
    if (assetsLocked) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed walletIcon={WalletIcon} />
            <AssetsLockedByLP address={lp_address} />
            <AssetsLockedByUser walletIcon={WalletIcon} />
            <LpPlng address={lp_address} />
        </div >
    }
    if (userInitiatedLock) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed walletIcon={WalletIcon} />
            <AssetsLockedByLP address={lp_address} />
            <UserLocking walletIcon={WalletIcon} />
        </div >
    }
    if (lpLockDetected) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed walletIcon={WalletIcon} />
            <AssetsLockedByLP address={lp_address} />
        </div >
    }
    if (commited) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <Committed walletIcon={WalletIcon} />
            <LpPlng address={lp_address} />
        </div >
    }
    if (commtting) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <UserCommitting walletIcon={WalletIcon} />
        </div >
    }
    return <>
        <div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-primary-text flex gap-1 items-center">New Atomic Bridging Protocol</h1>
            <p className="mt-3 mb-5 text-md leading-1 text-secondary-text ">
                <span>Experience fully permissionless and trustless bridging without relying on any third party. For enhanced security, the bridging process uses</span> <span className="font-bold">two transactions</span>
            </p>
            <a className="mt-6 text-sm  cursor-pointer leading-1 text-primary hover:underline flex items-center gap-1"
                href="https://layerswap.notion.site/" target="_blank" rel="noreferrer"
            >
                <span>Learn more about the protocol</span> <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    </>
}
const ResolveAction: FC = () => {
    const { committment, destinationLock, sourceLock, error, setError } = useAtomicState()

    const commited = committment ? true : false;
    const lpLockDetected = destinationLock ? true : false;
    const assetsLocked = committment?.locked && destinationLock ? true : false;
    const redeemCompleted = sourceLock?.redeemed ? true : false;

    if (error) {
        return <div className="w-full flex flex-col gap-4">
            <div className="flex w-full grow flex-col space-y-2" >
                <ActionStatus
                    status="error"
                    title={error}
                />
            </div >
            <SubmitButton onClick={() => setError(undefined)}>
                Try again
            </SubmitButton>
        </div>

    }
    if (redeemCompleted) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <ActionStatus
                status="success"
                title='Transaction Completed'
            />
        </div >
    }
    if (assetsLocked) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <RedeemAction />
        </div >
    }
    if (lpLockDetected) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <UserLockAction />
        </div >
    }
    if (commited) {
        return <div className="flex w-full grow flex-col space-y-2" >
            <LpLockingAssets />
        </div >
    }
    return <div className="flex w-full grow flex-col space-y-2" >
        <UserCommitAction />
    </div >
}


export const ActionsWithProgressbar: FC = () => {
    const { committment, destinationLock } = useAtomicState()
    let currentStep = 1
    let actiontext = 'Commit'
    let firstStep = "5%"
    let secondStep = "0%"
    if (committment) {
        firstStep = "80%"
    }
    if (destinationLock) {
        firstStep = "100%"
        secondStep = "10%"
        currentStep = 2
        actiontext = 'Lock'
    }
    if (committment?.locked) {
        firstStep = "100%"
        secondStep = "100%"
        currentStep = 2
    }

    const allDone = committment?.locked ? true : false

    return <div className="space-y-4">
        {
            !allDone &&
            <div className="space-y-1 relative">
                {
                    allDone ?
                        <div className="text-secondary-text text-xs">
                            Completed
                        </div>
                        :
                        <div className="text-secondary-text text-xs">
                            Step <>{currentStep}</>/2 - <>{actiontext}</>
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