type iconStyle = 'red' | 'green'

class MessageComponentProps {
    children: JSX.Element | JSX.Element[];
    icon: iconStyle
}

function constructIcons(icon: iconStyle) {

    let iconStyle: JSX.Element

    switch (icon) {
        case 'red':
            iconStyle = <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1" />
                <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5" />
                <circle cx="58" cy="58" r="30" fill="#E43636" />
                <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
            </svg>;
            break;
        case 'green':
            iconStyle = <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                <circle cx="58" cy="58" r="58" fill="#55B585" fillOpacity="0.1" />
                <circle cx="58" cy="58" r="45" fill="#55B585" fillOpacity="0.3" />
                <circle cx="58" cy="58" r="30" fill="#55B585" />
                <path d="M44.5781 57.245L53.7516 66.6843L70.6308 49.3159" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
            </svg>;
            break;
    }
    return iconStyle
}

const MessageComponent = ({ children }) => {
    return <div className="w-full flex flex-col h-full justify-between px-6 md:px-8 py-6 min-h-full">
        {children}
    </div>
}

const Content = ({ children, icon }: MessageComponentProps) => {
    return <div className='space-y-8'>
        <div className='flex place-content-center'>{constructIcons(icon)}</div>
        {children}
    </div>
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


