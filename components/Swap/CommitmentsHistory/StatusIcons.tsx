import { HistoryCommit } from ".";

export default function StatusIcon({ commit, short }: { commit: HistoryCommit, short?: boolean }) {
  const status = commit.status;
  switch (status) {
    case 'committed':
      return (
        <div className="inline-flex items-center">
          <YellowIcon />
          {
            !short && <p>Committed</p>
          }
        </div>
      )
    case 'lp_locked':
      return (
        <div className="inline-flex items-center">
          <YellowIcon />
          {!short && <p>LP Locked</p>}
        </div>
      )
    case 'user_locked':
      return (
        <div className="inline-flex items-center">
          <PurpleIcon />
          {!short && <p>User locked</p>}
        </div>
      )
    case 'completed':
      return (
        <div className="inline-flex items-center">
          <GreenIcon />
          {!short && <p>Completed</p>}
        </div>
      )
    case 'timelock_expired':
      return (
        <div className="inline-flex items-center">
          <RedIcon />
          {!short && <p>Timelock expired</p>}
        </div>
      )

    case 'refunded':
      return (
        <div className="inline-flex items-center">
          <GreyIcon />
          {!short && <p>Refunded</p>}
        </div>
      )
    default:
      return <></>
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