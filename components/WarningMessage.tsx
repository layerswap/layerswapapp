import { FC } from "react";

type Props = {
    children: JSX.Element | JSX.Element[];
    className?: string
}

const WarningMessage: FC<Props> = (({ children, className }) => {
    return (
        <div className={`flex-col w-full rounded-md bg-yellow-400 shadow-lg p-2 ${className}`}>
            <div className='flex items-center'>
                <div className='mr-2 p-2 rounded-lg bg-yellow-500'>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    )
})

export default WarningMessage;