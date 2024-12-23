import { FC } from "react";
import { UserCommitAction, UserLockAction, UserRefundAction } from "./Actions/UserActions";
import { useAtomicState } from "../../../context/atomicContext";
import { LpLockingAssets } from "./Actions/LpLock";
import { RedeemAction } from "./Actions/Redeem";
import ActionStatus from "./Actions/Status/ActionStatus";
import useWallet from "../../../hooks/useWallet";
import { CircleCheck } from "lucide-react";
import SubmitButton from "../../buttons/submitButton";
import TimelockTimer from "./Timer";
import shortenAddress from "../../utils/ShortenAddress";
import LoaderIcon from "../../icons/LoaderIcon";
import LockIcon from "../../icons/LockIcon";

export enum Progress {
    Commit = 'commit',
    LpLock = 'lp_lock',
    Lock = 'lock',
    Redeem = 'redeem',
    Refund = 'refund',
}

const RequestStep = () => {
    const { sourceDetails, commitId, commitTxId, source_network } = useAtomicState()

    const commtting = (commitId && !sourceDetails) ? true : false;
    const commited = sourceDetails ? true : false;

    const title = commited ? "Requested" : "Request"
    const description = commitTxId ? <p><span>Transaction ID:</span> <a target="_blank" className="underline hover:no-underline" href={source_network?.transaction_explorer_template.replace('{0}', commitTxId)}>{shortenAddress(commitTxId)}</a></p> : <>Initiates a swap process with the solver</>
    return <Step
        step={1}
        title={title}
        description={description}
        active={true}
        completed={!!sourceDetails}
        loading={commtting}
    >
    </Step>
}

const SignAndConfirmStep = () => {
    const { sourceDetails, destinationDetails, source_network, userLocked } = useAtomicState()

    const commited = sourceDetails ? true : false;

    const assetsLocked = sourceDetails?.hashlock && destinationDetails?.hashlock ? true : false;

    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const lp_address = source_network?.metadata.lp_address

    const title = assetsLocked ? "Signed & Confirmed" : "Sign & Confirm"
    const description = (assetsLocked) ? <div><span>Solver:</span><span>{lp_address && shortenAddress(lp_address)}</span> <span>You:</span><span>{wallet?.address && shortenAddress(wallet?.address)}</span></div> : <>Initiates a swap process with the solver</>

    return <Step
        step={2}
        title={title}
        description={description}
        active={commited}
        completed={!!userLocked}
    >
        <SolverStatus />
    </Step>
}

const SolverStatus = () => {
    const { sourceDetails, destinationDetails, commitFromApi, destination_network } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === 'lock')

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;

    // TODO: maybe we should show the locked amount
    if (!commited)
        return null
    //TODO: add the timer
    if (lpLockDetected)
        return <div className="p-1 pl-1.5 inline-flex items-center gap-3 mt-2 w-full">
            <LockIcon className="h-7 w-7" />

            <div className="text-xs text-primary-text-placeholder">
                <span className="text-primary-text text-base">Solver locked assets</span>
                {
                    lpLockTx && destination_network &&
                    <>
                        <span className="text-primary-text text-base ml-1">-</span> <span>Transaction ID:</span> <a target="_blank" href={destination_network.transaction_explorer_template.replace('{0}', lpLockTx.hash)} className="underline hover:no-underline">{shortenAddress(lpLockTx.hash)}</a>
                    </>
                }
            </div>
        </div>

    return <div className="p-1 mt-2 w-full">
        <p className="p-1">Solver is locking assets</p>
        <hr className="border-secondary-700 border-2 rounded-full" />
    </div>
}


export const ResolveMessages: FC<{ timelock: number | undefined, showTimer: boolean }> = ({ timelock, showTimer }) => {
    //TODO: add loading steps
    return <div className="space-y-2">
        <div className="flex items-center w-full justify-between text-primary-text-placeholder text-sm">
            <p>
                Follow the steps to complete swap
            </p>
            {
                timelock && showTimer &&
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
    loading?: boolean
}
const Step: FC<StepProps> = ({ step, title, description, active, children, completed, loading }) => {
    return <div className={`flex justify-between items-center w-full bg-secondary-600 rounded-componentRoundness p-2 ${!active ? 'opacity-40' : ''}`}>
        <div className="w-full">
            {/* TODO: text colors for none active steps */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 text-center content-center bg-secondary-400 rounded-md">{step}</div>
                <div>
                    <div className="text-primary-text text-base leading-5">{title}</div>
                    <div className="text-xs text-primary-text-placeholder">{description}</div>
                </div>
            </div>
            {children}
        </div>
        {
            completed &&
            <CircleCheck className="h-6 w-6 mr-3" />
        }
        {
            loading &&
            <LoaderIcon className="animate-reverse-spin h-6 w-6 mr-3" />
        }
    </div>
}

export const ActionsWithProgressbar: FC = () => {
    const { destinationDetails, isTimelockExpired, sourceDetails, commitFromApi, destination_network } = useAtomicState()

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === 'redeem' && t.network === destination_network?.name)

    const allDone = ((sourceDetails?.hashlock && destinationDetails?.claimed == 3) || lpRedeemTransaction?.hash) ? true : false
    const showTimer = !allDone && !isTimelockExpired
    const timelock = sourceDetails?.timelock || sourceDetails?.timelock

    return <div className="space-y-4">
        <ResolveMessages timelock={timelock} showTimer={showTimer} />
        <ResolveAction />
    </div>
}