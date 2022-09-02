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

export default function StatusIcon({ swap }) {
    if (swap?.status === 'failed') {
      return (
        <>
          <div className="inline-flex items-center">
            <RedIcon />
            <p>Failed</p>
          </div>
        </>)
    } else if (swap?.status === 'completed') {
      return (
        <>
          <div className="inline-flex items-center">
            <GreenIcon />
            <p>Completed</p>
          </div>
        </>
      )
    }
    else if (swap?.payment?.status == "closed") {
      return (
        <>
          <div className="inline-flex items-center">
            <RedIcon />
            <p>Closed</p>
          </div>
        </>)
    }
    else if (swap?.payment?.status == "expired") {
      return (
        <>
          <div className="inline-flex items-center">
            <RedIcon />
            <p>Expired</p>
          </div>
        </>)
    }
    else {
      return <>
        <div className="inline-flex items-center">
          <YellowIcon />
          <p>Pending</p>
        </div>
      </>
    }
  }