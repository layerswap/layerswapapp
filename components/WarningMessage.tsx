import { ExclamationIcon, InformationCircleIcon } from "@heroicons/react/outline";
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
            iconStyle = <ExclamationIcon className="h-5 w-5 text-black" />;
            break;
        case 'informating':
            iconStyle = <InformationCircleIcon className="h-5 w-5 text-black" />;
            break;
    }
    return iconStyle
}

const WarningMessage: FC<Props> = (({ children, className, messageType = 'warning' }) => {
    return (
        <div className={`flex-col w-full rounded-md ${messageType == 'warning' ? 'bg-yellow-400' : "bg-green-400 text-white"} shadow-lg p-2 ${className}`}>
            <div className='flex items-center'>
                <div className={`mr-2 p-2 rounded-lg ${messageType == 'warning' ? 'bg-yellow-500' : "bg-green-500"}`}>
                    {constructIcons(messageType)}
                </div>
                <div className="text-sm">
                    {children}
                </div>
            </div>
        </div>
    )
})

export default WarningMessage;