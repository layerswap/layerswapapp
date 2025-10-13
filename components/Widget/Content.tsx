type ContetProps = {
    center?: boolean,
    children?: JSX.Element | JSX.Element[];
}
const Content = ({ children, center }: ContetProps) => {
    return center ?
        <div className='flex flex-col self-center grow w-full h-full min-h-0'>
            <div className='flex self-center grow w-full h-full min-h-0'>
                <div className='flex flex-col self-center w-full grow h-full min-h-0'>
                    {children}
                </div>
            </div>
        </div>
        : <div className='h-full min-h-0 grow flex flex-1 w-full'>{children}</div>
}
export default Content