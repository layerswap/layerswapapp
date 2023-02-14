export type ProcessingSteps = {
    status: 'active' | 'inactive'
    name: string,
    header: JSX.Element | JSX.Element[] | string,
    description: JSX.Element | JSX.Element[] | string
}

export const ProcessingComponent = ({ processingSteps }: { processingSteps: ProcessingSteps[] }) => {
    const step = processingSteps.find(ps => ps.status === 'active')

    return (
        <div className="w-full flex flex-col justify-center h-full">
            <div className='flex place-content-center mb-8'>
                <div className='relative'>
                    <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                    <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                    <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                </div>
            </div>
            <div className="flex flex-col text-center mt-1 text-lg font-lighter text-primary-text">
                <p className='text-white'>
                    {step.header}
                </p>
                <p className='text-sm'>
                    {step.description}
                </p>
            </div>
        </div>
    )
}
