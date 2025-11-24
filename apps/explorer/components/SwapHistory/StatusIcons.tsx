import { SwapStatus } from "../../models/SwapStatus";
import { CheckCircleFilled } from "../icons/CheckCircleFilled";

export default function StatusIcon({ swap }: { swap: string | undefined }) {
  switch (swap) {
    case SwapStatus.Failed:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background w-max">
            <span className="font-medium md:text-sm text-base">Failed</span>
          </div>
        </>)
    case SwapStatus.Refunded:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background w-max">
            <span className="font-medium md:text-sm text-base">Refunded</span>
          </div>
        </>)
    case SwapStatus.Completed:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-success-foreground bg-success-background w-max">
            <CheckCircleFilled className="w-3.5 h-3.5" />
            <span className="font-medium md:text-sm text-base">Completed</span>
          </div>
        </>
      )
    case SwapStatus.Cancelled:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background w-max">
            <GreyIcon />
            <span className="font-medium md:text-sm text-base">Cancelled</span>
          </div>
        </>
      )
    case SwapStatus.UserTransferPending:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-warning-foreground bg-warning-background w-max">
            <span className="w-3 h-3 rounded-full bg-warning-foreground"></span>
            <span className="font-medium md:text-sm text-base">Deposit pending</span>
          </div>
        </>)
    case SwapStatus.UserTransferDelayed:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-warning-foreground bg-warning-background w-max">
            <span className="w-3 h-3 rounded-full bg-warning-foreground"></span>
            <span className="font-medium md:text-sm text-base">Delayed</span>
          </div>
        </>)
    case SwapStatus.LsTransferPending:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-warning-foreground bg-warning-background w-max">
            <span className="w-3 h-3 rounded-full bg-warning-foreground"></span>
            <span className="font-medium md:text-sm text-base">In Progress</span>
          </div>
        </>)
    case SwapStatus.Expired:
      return (
        <>
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background w-max">
            <GreyIcon />
            <span className="font-medium md:text-sm text-base">Expired</span>
          </div>
        </>)
  }
}

export const YellowIcon = () => {
  return (
    <svg className="w-2 h-2 rounded-sm mr-1">
      <rect fill="currentColor" width="100%" height="100%"></rect>
    </svg>
  )
}

export const GreyIcon = () => {
  return (
    <svg className="w-2 h-2 rounded-sm mr-1">
      <rect fill="#808080" width="100%" height="100%"></rect>
    </svg>
  )
}
