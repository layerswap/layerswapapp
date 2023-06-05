import CancelIcon from "./icons/CancelIcon";
import DelayIcon from "./icons/DelayIcon";
import FailIcon from "./icons/FailIcon";
import SuccessIcon from "./icons/SuccessIcon";
type iconStyle = 'red' | 'green' | 'yellow' | 'gray'

class MessageComponentProps {
    children: JSX.Element | JSX.Element[];
    center?: boolean
    icon: iconStyle
}

function constructIcons(icon: iconStyle) {

    let iconStyle: JSX.Element

    switch (icon) {
        case 'red':
            iconStyle = <FailIcon />;
            break;
        case 'green':
            iconStyle = SuccessIcon;
            break;
        case 'yellow':
            iconStyle = DelayIcon
            break
        case 'gray':
            iconStyle = CancelIcon
            break
    }
    return iconStyle
}

const MessageComponent = ({ children }) => {
    return <div className="w-full flex flex-col h-full justify-between pt-6 min-h-full">
        {children}
    </div>
}

const Content = ({ children, icon, center }: MessageComponentProps) => {
    return (
        center ?
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex self-center grow w-full'>
                    <div className='flex flex-col space-y-8 self-center w-full'>
                        <div className='flex place-content-center'>{constructIcons(icon)}</div>
                        {children}
                    </div>
                </div>
            </div>
            :
            <div className='space-y-3'>
                <div className='flex place-content-center'>{constructIcons(icon)}</div>
                {children}
            </div>
    )
}

const Header = ({ children }) => {
    return <div className='md:text-3xl text-lg font-bold text-white leading-6 text-center'>
        {children}
    </div>
}

const Description = ({ children }) => {
    return <div className="text-base font-medium space-y-6 text-primary-text text-center">
        {children}
    </div>
}

const Buttons = ({ children }) => {
    return <div className="space-y-3 mt-6">
        {children}
    </div>
}

MessageComponent.Content = Content
MessageComponent.Header = Header
MessageComponent.Description = Description
MessageComponent.Buttons = Buttons

export default MessageComponent


