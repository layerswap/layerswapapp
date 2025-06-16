type ContetProps = {
    center?: boolean,
    children?: JSX.Element | JSX.Element[];
}
const Content = ({ children, center }: ContetProps) => {
    return center ?
        <div className='flex flex-col self-center grow w-full'>
            <div className='flex self-center grow w-full'>
                <div className='flex flex-col self-center w-full'>
                    {children}
                </div>
            </div>
        </div>
        : <div>{children}</div>
}
export default Content