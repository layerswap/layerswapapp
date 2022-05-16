import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';

const OverviewStep: FC = () => {

    const [email, setEmail] = useState()
    const { prevStep, nextStep } = useWizardState();

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-8">
                    <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <p className="text-left">Payment Number: #52848</p>
                        <p className="text-left">Merchart: Layerswap</p>
                        <p className="text-left">Payment Method: Coinbase</p>
                        <p className="text-left">Amount: 111 LRC</p>
                        <p className="text-left">Bransfer fee: 0 LRC</p>
                    </div>
                    <div className="items-center inline-flex mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <p className="inline-flex">Payment Number: <span className="text-right text-white">#52848</span></p>
                    </div>
                </div>
                <div>
                    <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                        Coinbase 2FA Code
                    </label>
                    <div className="relative rounded-md shadow-sm mt-2 mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="XXXXXX"
                            autoCorrect="off"
                            type="text"
                            maxLength={6}
                            name="Code"
                            id="Code"
                            className="h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                            placeholder:text-light-blue placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                        />
                    </div>
                </div>
                <div className="text-white text-sm mt-auto mt-4">
                    <SubmitButton isDisabled={false} defaultStyle="bg-pink-primary text-lg" icon="" isSubmitting={false} onClick={prevStep}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default OverviewStep;