import { ExclamationIcon, AcademicCapIcon } from "@heroicons/react/outline";
import { FC } from "react";

type messageType = 'warning' | 'informating'

type Props = {
    children: JSX.Element | JSX.Element[] | string;
    messageType?: messageType;
    className?: string
}

function constructIcons(messageType: messageType) {

    let iconStyle: JSX.Element

    switch (messageType) {
        case 'warning':
            iconStyle = <ExclamationIcon className="sm:h-5 h-4 text-black inline sm:block" />;
            break;
        case 'informating':
            iconStyle = <AcademicCapIcon className="sm:h-5 h-4 text-white inline self-center sm:block" />;
            break;
    }
    return iconStyle
}

const WarningMessage: FC<Props> = (({ children, className, messageType = 'warning' }) => {
    return (
        <div className={`flex-col w-full rounded-md ${messageType == 'warning' ? 'bg-yellow-400' : "bg-slate-800 text-white"} shadow-lg p-2 ${className}`}>
            <div className='flex items-center'>
                <div className={`mr-2 hidden sm:inline p-2 rounded-lg ${messageType == 'warning' ? 'bg-yellow-500' : "bg-slate-900 text-white"}`}>
                    {constructIcons(messageType)}
                </div>
                <div className={`text-xs sm:text-sm leading-5 ${messageType == 'warning' ? 'text-darkblue-600 font-semibold' : "text-white font-normal"}`}>
                    <span className={`sm:hidden mr-1 pb-1.5 pt-1 px-1 rounded-md ${messageType == 'warning' ? 'bg-yellow-500' : "bg-slate-900 text-white"}`}>
                        {constructIcons(messageType)}
                    </span>
                    <span>{children}</span>
                </div>
            </div>
        </div>
    )
})

export default WarningMessage;