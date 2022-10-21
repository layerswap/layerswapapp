import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useIntercom } from 'react-use-intercom';
import SubmitButton from '../../buttons/submitButton';
import { useAuthState } from '../../../context/authContext';

const FailedStep: FC = () => {
    const { swap } = useSwapDataState()
    const { email } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, customAttributes: { swapId: swap?.data?.id } })
    return (
        <>
            <div className="w-full py-12 grid grid-flow-row">
                <div className='flex place-content-center mb-12 md:mb-4'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5" />
                        <circle cx="58" cy="58" r="30" fill="#E43636" />
                        <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                        <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                    </svg>
                </div>
                <p className='mb-12 mt-2 pt-2 md:text-2xl text-lg font-bold text-white leading-6 text-center font-roboto'>
                    {swap ? "Swap failed" : "Swap not found"}
                </p>
                {
                    swap?.data?.message &&
                    <div className="mb-12 text-md font-medium space-y-6 text-primary-text">
                        <p>
                            {swap.data.message}
                        </p>
                    </div>
                }
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                    boot();
                    show();
                    updateWithProps()
                }}>
                    Contact Support
                </SubmitButton>
            </div>
        </>
    )
}

export default FailedStep;