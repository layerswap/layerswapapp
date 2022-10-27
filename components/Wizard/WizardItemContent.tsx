class MessageComponentProps {
    children: JSX.Element | JSX.Element[];
}

const WizardItemContent = ({ children }) => {
    return <div className="w-full flex flex-col h-full justify-between min-h-full">
        {children}
    </div>
}

const Content = ({ children }: MessageComponentProps) => {
    return <div className=''>
        {children}
    </div>
}

const Buttons = ({ children }) => {
    return <div className="">
        {children}
    </div>
}

WizardItemContent.Content = Content
WizardItemContent.Buttons = Buttons

export default WizardItemContent


