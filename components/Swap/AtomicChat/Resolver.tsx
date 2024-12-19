import { FC } from "react";
import Message from "./Message";
import AddressIcon from "../../AddressIcon";
import { UserCommitAction, UserLockAction, UserRefundAction } from "./Actions/UserActions";
import { useAtomicState } from "../../../context/atomicContext";
import { motion } from "framer-motion";
import { LpLockingAssets } from "./Actions/LpLock";
import { RedeemAction } from "./Actions/Redeem";
import ActionStatus from "./Actions/ActionStatus";
import useWallet from "../../../hooks/useWallet";
import { CircleCheck, ExternalLink, HelpCircle } from "lucide-react";
import SubmitButton from "../../buttons/submitButton";
import { Network } from "../../../Models/Network";
import TimelockTimer from "./TimelockTimer";
import { truncateDecimals } from "../../utils/RoundDecimals";
import shortenAddress from "../../utils/ShortenAddress";

export enum Progress {
    Commit = 'commit',
    LpLock = 'lp_lock',
    Lock = 'lock',
    Redeem = 'redeem',
    Refund = 'refund',
}

const RequestStep = () => {
    const { sourceDetails, commitId } = useAtomicState()

    const commtting = commitId ? true : false;
    const commited = sourceDetails ? true : false;

    const title = commited ? "Requested" : "Request"
    //TODO: get the commitment transaction id
    const description = sourceDetails ? <div>Transaction ID:{sourceDetails?.id}</div> : <>Initiates a swap process with the solver</>
    return <Step
        step={1}
        title={title}
        description={description}
        active={true}
        completed={!!sourceDetails}
    >
    </Step>
}

const SignAndConfirmStep = () => {
    const { sourceDetails, destinationDetails, source_network } = useAtomicState()

    const commited = sourceDetails ? true : false;

    const assetsLocked = sourceDetails?.hashlock && destinationDetails?.hashlock ? true : false;

    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const lp_address = source_network?.metadata.lp_address

    const title = assetsLocked ? "Signed & Confirmed" : "Sign & Confirm"
    //TODO: get the commitment transaction id
    const description = (assetsLocked) ? <div>Solver:{lp_address && shortenAddress(lp_address)} You: {wallet?.address && shortenAddress(wallet?.address)}</div> : <>Initiates a swap process with the solver</>

    return <Step
        step={2}
        title={title}
        description={description}
        active={commited}
    >
        <SolverStatus />
    </Step>
}

const SolverStatus = () => {
    const { sourceDetails, destinationDetails } = useAtomicState()

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;

    //TODO: maybe we should show the locked amount
    if (!commited)
        return null
    //TODO: add the timer
    if (lpLockDetected)
        return <>Solver locked assets</>

    return <>Solver is locking assets</>
}


export const ResolveMessages: FC<{ timelock: number | undefined }> = ({ timelock }) => {
    //TODO: add loading steps
    return <div className="space-y-2">
        <div className="flex items-center w-full justify-between text-primary-text-placeholder text-sm">
            <p>
                Follow the steps to complete swap
            </p>
            {
                timelock &&
                <TimelockTimer timelock={timelock} />
            }
        </div>
        <div className="space-y-4">
            <RequestStep />
            <SignAndConfirmStep />
        </div>
    </div>
}
const ResolveAction: FC = () => {
    const { sourceDetails, destinationDetails, destination_network, error, setError, isTimelockExpired, commitFromApi } = useAtomicState()

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === 'redeem' && t.network === destination_network?.name)

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;
    const assetsLocked = sourceDetails?.hashlock && destinationDetails?.hashlock ? true : false;
    const redeemCompleted = (destinationDetails?.claimed == 3 ? true : false) || lpRedeemTransaction?.hash;


    //TODO: remove lp actions just disable the button
    if (error) {
        return <div className="w-full flex flex-col gap-4">
            <div className="flex w-full grow flex-col space-y-2" >
                <ActionStatus
                    status="error"
                    title={<p className="break-all">{error}</p>}
                />
            </div >
            <SubmitButton onClick={() => setError(undefined)}>
                Try again
            </SubmitButton>
        </div>

    }
    if (redeemCompleted) {
        return <ActionStatus
            status="success"
            title='Transaction Completed'
        />
    }
    if (isTimelockExpired) {
        if (sourceDetails?.claimed == 2) {
            return <ActionStatus
                status="success"
                title='Refund Completed'
            />
        }
        else {
            return <UserRefundAction />
        }
    }
    if (assetsLocked) {
        return <RedeemAction />
    }
    if (lpLockDetected) {
        return <UserLockAction />
    }
    if (commited) {
        return <LpLockingAssets />
    }
    return <UserCommitAction />
}

type StepProps = {
    step: number;
    title: string;
    description: JSX.Element | string;
    children?: JSX.Element | JSX.Element[];
    active: boolean;
    completed?: boolean
}
const Step: FC<StepProps> = ({ step, title, description, active, children, completed }) => {
    return <div className={`flex justify-between items-center w-full bg-secondary-600 rounded-componentRoundness p-2 pr-5 ${!active ? 'opacity-40' : ''}`}>
        <div>
            {/* TODO: text colors for none active steps */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 text-center content-center bg-secondary-400 rounded-md">{step}</div>
                <div>
                    <p className="text-primary-text text-base leading-5">{title}</p>
                    <p className="text-xs text-primary-text-placeholder">{description}</p>
                </div>
            </div>
            {children}
        </div>
        {
            completed &&
            <CircleCheck className="h-6 w-6" />
        }
    </div>
}

export const ActionsWithProgressbar: FC = () => {
    const { destinationDetails, isTimelockExpired, sourceDetails, commitFromApi, destination_network } = useAtomicState()

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === 'redeem' && t.network === destination_network?.name)

    const allDone = ((sourceDetails?.hashlock && destinationDetails?.claimed == 3) || lpRedeemTransaction?.hash) ? true : false
    const showSteps = !allDone && !isTimelockExpired
    const timelock = sourceDetails?.timelock || sourceDetails?.timelock

    return <div className="space-y-4">
        <ResolveMessages timelock={timelock} />
        <ResolveAction />
    </div>
}