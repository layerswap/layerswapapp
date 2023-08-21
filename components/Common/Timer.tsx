import { FC, useEffect, useState } from "react";

type TimerProps = {
    children: JSX.Element | JSX.Element[];
    time: number;
    text: (remainingSeconds: number) => JSX.Element
}

const SimpleTimer: FC<TimerProps> = ({ time, children, text }) => {
    const [remainingSeconds, setRemainingSeconds] = useState<number>();

    const getTime = (deadline) => {
        const time = deadline - Date.now();
        setRemainingSeconds(Math.floor((time / 1000)));
    };
    
    useEffect(()=>{
        getTime(time)
    },[time])

    useEffect(() => {
        const interval = setInterval(() => getTime(time), 1000);
        return () => clearInterval(interval);
    }, []);


    if (!remainingSeconds)
        return <></>

    return <>
        {
            (remainingSeconds > 0) ?
                <div>
                    <div className="flex text-center mb-4 space-x-2">
                        <div className='relative'>
                            <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                            <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                            <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                        </div>
                        <label className="text-xs self-center md:text-sm sm:font-semibold text-secondary-text">{text(remainingSeconds)}</label>
                    </div>
                </div>
                : <>
                    {children}
                </>
        }
    </>

}
export default SimpleTimer