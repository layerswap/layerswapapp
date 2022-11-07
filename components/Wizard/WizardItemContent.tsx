const WizardItemContent = ({ children }) => {
    return <div className="w-full flex flex-col h-full justify-between min-h-full space-y-6">
        {children}
    </div>
}

const Head = ({ children }) => {
    return <div>
        {children}
    </div>
}

const Bottom = ({ children }) => {
    return <div>
        {children}
    </div>
}

WizardItemContent.Head = Head
WizardItemContent.Bottom = Bottom

export default WizardItemContent


