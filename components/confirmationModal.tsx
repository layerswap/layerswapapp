import { CheckIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { FC, useState } from 'react'
import SubmitButton from './buttons/submitButton';
import { SwapFormValues } from './DTOs/SwapFormValues';
import Modal from './modalComponent';

interface ConfirmationModalParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    formValues?: SwapFormValues,
    isOfframp: boolean,
}

const ConfirmationModal: FC<ConfirmationModalParams> = ({ onConfirm, formValues, isOfframp, ...modalParams }) => {

    if (!(formValues && formValues.amount && formValues.currency && formValues.destination_address && formValues.exchange && formValues.network)) {
        return <></>
    }

    let { amount, currency, destination_address, exchange, network } = formValues;

    const modalDescription = () => {
        if (isOfframp) {
            return (
                <div className='text-base'>
                    <span>
                        You are requesting a transfer of <span className='text-indigo-100 font-bold'> {amount} {currency.name}</span> from your <span className='text-indigo-100 font-bold'>{network.name}</span> network wallet to your <span className='text-indigo-100 font-bold'>{exchange.name}</span> exchange address (<span className='text-indigo-100 font-bold'>{destination_address}</span>)
                        <p className='mt-2'>To continue, you have to confirm that </p>
                    </span>
                </div>)
        }
        else {
            return (
                <div className='text-base'>
                    <span>
                        You are requesting a transfer of <span className='text-indigo-100 font-bold'> {amount} {currency.name}</span> from your <span className='text-indigo-100 font-bold'>{exchange.name}</span> exchange account to your <span className='text-indigo-100 font-bold'>{network.name}</span> wallet  <span className='text-indigo-100 font-bold'>({destination_address.slice(0, 5) + "..." + destination_address.slice(destination_address.length - 4, destination_address.length)})</span>
                        <p className='mt-2'>To continue, you have to confirm that </p>
                    </span>
                </div>)
        }
    }

    const checkboxes = [
        { label: <span>The provided address is your <span className='text-indigo-300'>{isOfframp ? exchange.name + " exchange" : network.name + " wallet"}</span> address</span> },
        { label: <span>Providing wrong information will result in a loss of funds</span> },
    ]

    const [checkedState, setCheckedState] = useState(
        new Array(checkboxes.length).fill(false)
    );

    const handleOnChange = (position) =>
        setCheckedState(checkedState.map((item, index) =>
            index === position ? !item : item
        ));

    const checkButtonIcon = <CheckIcon className='h-5 w-5'></CheckIcon>

    return (
        <Modal title='Swap Confirmation' {...modalParams} description={modalDescription()}>
            <fieldset className="space-y-5">
                <legend className="sr-only">Confirm Swap</legend>
                {
                    checkboxes.map(function (element, index) {
                        return (<div className="relative flex items-start" key={index}>

                            <div className="flex items-center h-5">
                                <input
                                    id={"Check" + index}
                                    type="checkbox"
                                    tabIndex={index}
                                    onChange={() => handleOnChange(index)}
                                    checked={checkedState[index]}
                                    className="focus:border-transparent focus:ring-transparent h-4 w-4 text-indigo-600 border-blueGray-500 bg-blueGray-600 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor={"Check" + index} className="font-medium text-base text-gray-200">
                                    {element.label}
                                </label>
                            </div>
                        </div>)
                    })
                }
            </fieldset>
            {/* <p className='text-white mt-4 pt-2 border-t-2 border-indigo-300'>First time here? Please read the  <Link key="userGuide" href="/userguide"><a className="text-indigo-400 font-semibold underline hover:cursor-pointer"> User Guide</a></Link></p> */}
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton isDisabled={!checkedState.every(x => x === true)} icon={checkButtonIcon} isSubmitting={false} onClick={() => onConfirm()}>
                    Confirm
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default ConfirmationModal;