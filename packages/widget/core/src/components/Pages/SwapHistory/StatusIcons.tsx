import { SwapStatus } from '@layerswap/widget-types';
import CircleCheckIcon from "@/components/Icons/CircleCheckIcon";
import { SwapItem, TransactionType, TransactionStatus } from "@/lib/apiClients/layerSwapApiClient"
import { useGaslessAuthorizationStatus } from '@/hooks/useGaslessAuthorizationStatus';
import { useInputTransactionStatus } from '@/hooks/useInputTransactionStatus';
import { isGaslessAuthorizationSubmitted } from '@/helpers/gasless';
import { useSwapTransactionStore, useGaslessAuthorizationStore } from '@/stores/swapTransactionStore';

export default function StatusIcon({ swap, withBg, short }: { swap: SwapItem, withBg?: boolean, short?: boolean }) {
  const hasInput = swap.transactions.some(t => t.type === TransactionType.Input)
  const observeAuthorization = swap.status === SwapStatus.UserTransferPending && !swap.use_deposit_address && !hasInput
  const { data, error } = useGaslessAuthorizationStatus(observeAuthorization ? swap.id : undefined, undefined, true, swap.quote_revision, true)
  const authorization = data?.data
  const missingAuthorization = (error as { response?: { status?: number } })?.response?.status === 404
  const sourceHash = useSwapTransactionStore(state => state.swapTransactions[swap.id]?.hash)
  const retainedGaslessHash = useGaslessAuthorizationStore(state => state.authorizations[swap.id]?.transaction?.transaction_hash)
  const { hashes, status: receiptStatus } = useInputTransactionStatus(swap.source_network.name, [
    sourceHash, retainedGaslessHash, authorization?.transaction?.transaction_hash,
  ], observeAuthorization)
  const liveReceipt = receiptStatus === TransactionStatus.Pending || receiptStatus === TransactionStatus.Completed
  const status = swap.status;
  switch (status) {
    case SwapStatus.Failed:
      return <RedComponenet text="Failed" withBg={withBg} short={short} />
    case SwapStatus.Completed:
      return <GreenComponent text="Completed" withBg={withBg} short={short} />
    case SwapStatus.Expired:
      return <SecondaryComponent text="Expired" withBg={withBg} short={short} />
    case SwapStatus.UserTransferPending:
      if (hasInput || authorization?.status === 'initiated' || isGaslessAuthorizationSubmitted(authorization) || liveReceipt) {
        return <PrimaryComponent text="In Progress" withBg={withBg} short={short} />
      }
      else if (hashes.length > 0 && !receiptStatus) {
        return <SecondaryComponent text="Checking transfer status" withBg={withBg} short={short} />
      }
      else if (receiptStatus === TransactionStatus.Failed) {
        return <RedComponenet text="Failed" withBg={withBg} short={short} />
      }
      else if (observeAuthorization && !missingAuthorization && (error || !authorization)) {
        return <SecondaryComponent text="Checking transfer status" withBg={withBg} short={short} />
      }
      else if (authorization && ['expired', 'insufficient', 'rejected'].includes(authorization.status)) {
        return <RedComponenet text="Failed" withBg={withBg} short={short} />
      }
      else {
        return <YellowComponent text="Incomplete" withBg={withBg} short={short} />
      }
    case SwapStatus.LsTransferPending:
      return <PrimaryComponent text="In Progress" withBg={withBg} short={short} />
    case SwapStatus.Created:
      return <YellowComponent text="Incomplete" withBg={withBg} short={short} />
    case SwapStatus.PendingRefund:
      return <YellowComponent text="Refund Pending" withBg={withBg} short={short} />
    case SwapStatus.Refunded:
      return <GreenComponent text="Refund Completed" withBg={withBg} short={short} />
    default:
      return <></>
  }
}

const IconComponentWrapper = ({ children, withBg, classNames }: { children: React.ReactNode, withBg?: boolean, classNames?: string }) => {
  return (
    <div className={`inline-flex items-center gap-1 font-bold ${classNames} ${withBg ? 'pt-3.5 py-1.5 w-full justify-center rounded-b-2xl' : 'rounded-md px-1 py-0.5'}`}>
      {children}
    </div>
  )
}

const GreenComponent = ({ text, withBg, short }: IconComponentProps) => {
  return (
    <IconComponentWrapper withBg={withBg} classNames="bg-success-background text-success-foreground text-sm">
      <CircleCheckIcon className="fill-success-foreground text-success-foreground" />
      {!short && <p>{text}</p>}
    </IconComponentWrapper>
  )
}

const PrimaryComponent = ({ text, withBg, short }: IconComponentProps) => {
  return (
    <IconComponentWrapper withBg={withBg} classNames="bg-primary-900 text-primary-500 text-sm">
      <div className='relative'>
        <div className='absolute top-0.5 left-0.5 w-3 h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
        <div className='relative top-0 left-0 w-4 h-4 scale-75 bg bg-primary rounded-full'></div>
      </div>
      {!short && <p>{text}</p>}
    </IconComponentWrapper>
  )
}

const SecondaryComponent = ({ text, withBg, short }: IconComponentProps) => {
  return (
    <IconComponentWrapper withBg={withBg} classNames="text-primary-text-tertiary bg-secondary-700 text-sm">
      {
        short ?
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 60 60" fill="currentColor" className="text-primary-text-tertiary">
            <circle cx="30" cy="30" r="30" fill="currentColor" />
          </svg>
          :
          <p>{text}</p>
      }
    </IconComponentWrapper>
  )
}

const YellowComponent = ({ text, withBg, short }: IconComponentProps) => {
  return (
    <IconComponentWrapper withBg={withBg} classNames="bg-warning-background text-warning-foreground text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="30" fill="#DF8B16" />
      </svg>
      {!short && <p className="text-sm font-bold">{text}</p>}
    </IconComponentWrapper>
  )
}

const RedComponenet = ({ text, withBg, short }: IconComponentProps) => {
  return (
    <IconComponentWrapper withBg={withBg} classNames="bg-error-background text-error-foreground text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 60 60" fill="none" className="fill-error-foreground">
        <circle cx="30" cy="30" r="30" fill="currentColor" />
      </svg>
      {!short && <p>{text}</p>}
    </IconComponentWrapper>
  )
}

type IconComponentProps = {
  text: string;
  withBg?: boolean;
  short?: boolean;
}
