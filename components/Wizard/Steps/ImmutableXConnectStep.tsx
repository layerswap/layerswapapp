import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import { useWizardState } from '../../../context/wizard';
import SubmitButton from '../../buttons/submitButton';



const SomeTestStep: FC = () => {

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>


            <div className="text-white text-sm mt-3">
                <SubmitButton isDisabled={false} icon="" isSubmitting={false} onClick={() => { }}>
                    Confirm
                </SubmitButton>
            </div>
        </>
    )
}

export default SomeTestStep;