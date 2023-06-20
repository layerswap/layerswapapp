import { FC } from 'react'
import Widget from '../../Wizard/Widget';


const External: FC = () => {


    return (
        <Widget.Content>
            <div className="w-full py-12 grid grid-flow-row">
                <div className='md:text-3xl text-lg font-bold text-white leading-6 text-center'>
                    Withdrawal pending
                </div>
                <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
                    <div className='relative'>
                        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-primary-800 rounded-full'></div>
                    </div>
                </div>
                <div className="flex flex-col text-center place-content-center mt-1 text-lg font-lighter text-primary-text">
                    <p className="text-base font-medium space-y-6 text-primary-text text-center">
                        The withdrawal has been initiated, please don't close this screen.
                    </p>
                </div>
            </div>
        </Widget.Content>
    )
}

export default External;
