const WizardItemContent = ({ children }) => {
    return <div className="w-full flex flex-col h-full justify-between min-h-full">
        {children}
    </div>
}

const Content = ({ children }) => {
    return <div>
        {children}
    </div>
}

const Buttons = ({ children }) => {
    return <div>
        {children}
    </div>
}

WizardItemContent.Content = Content
WizardItemContent.Buttons = Buttons

export default WizardItemContent


