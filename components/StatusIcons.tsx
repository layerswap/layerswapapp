import { SwapStatus } from "../Models/SwapStatus"

export default function StatusIcon({ status }: { status: SwapStatus }) {
  switch (status) {
    case SwapStatus.Failed:
      return (
        <>
          <div className="inline-flex items-center">
            <RedIcon />
            <p>Failed</p>
          </div>
        </>)
    case SwapStatus.Completed:
      return (
        <>
          <div className="inline-flex items-center">
            <GreenIcon />
            <p>Completed</p>
          </div>
        </>
      )
    case SwapStatus.Cancelled:
      <>
        <div className="inline-flex items-center">
          <GreyIcon />
          <p>Cancelled</p>
        </div>
      </>
    case SwapStatus.Expired:
      return (
        <>
          <div className="inline-flex items-center">
            <GreyIcon />
            <p>Expired</p>
          </div>
        </>)
    case SwapStatus.Initiated:
      return <>
        <div className="inline-flex items-center">
          <YellowIcon />
          <p>Pending</p>
        </div>
      </>
    case SwapStatus.PendingWithdrawal:
      return <>
        <div className="inline-flex items-center">
          <PurpleIcon />
          <p>Pending Withdrawal</p>
        </div>
      </>
    case SwapStatus.Created:
      <>
        <div className="inline-flex items-center">
          <YellowIcon />
          <p>Created</p>
        </div>
      </>
  }
}


export const RedIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#E43636" />
    </svg>
  )
}

export const GreenIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#55B585" />
    </svg>
  )
}

export const YellowIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2 lg:h-2 lg:w-2" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#facc15" />
    </svg>
  )
}

export const GreyIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2 lg:h-2 lg:w-2" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#808080" />
    </svg>
  )
}

export const PurpleIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2 lg:h-2 lg:w-2" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#A020F0" />
    </svg>
  )
}