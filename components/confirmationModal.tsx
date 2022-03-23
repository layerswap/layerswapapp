import Link from 'next/link';
import { FC, useState } from 'react'
import { SwapFormValues } from './DTOs/SwapFormValues';
import Modal from './modalComponent';
import SubmitButton from './submitButton';

interface ConfirmationModalParams {
    onDismiss: (isIntentional: boolean) => void;
    onConfirm: () => void;
    isOpen: boolean;
    formValues?: SwapFormValues
}

const ConfirmationModal: FC<ConfirmationModalParams> = ({ onConfirm, formValues, ...modalParams }) => {

    if (!(formValues && formValues.amount && formValues.currency && formValues.destination_address && formValues.exchange && formValues.network)) {
        return <></>
    }

    let { amount, currency, destination_address, exchange, network } = formValues;

    const modalDescription = () => {
        return (<div className='text-base'><span>You are requesting a transfer of <span className='text-indigo-100 font-bold'>{amount} {currency.name} </span> from your <span className='text-indigo-100 font-bold'>{exchange.name}</span> exchange account to your <span className='text-indigo-100 font-bold'>{network.name}</span> wallet  <span className='text-indigo-100 font-bold'>({destination_address.slice(0, 4) + "..." + destination_address.slice(destination_address.length - 4, destination_address.length)})</span></span></div>)
    }

    const checkboxes = [
        { label: <span>The provided address is my <span className='text-indigo-300'>{network.name}</span> wallet address</span> },
        { label: <span>Providing wrong information will result in a loss of funds</span> },
    ]

    const [checkedState, setCheckedState] = useState(
        new Array(checkboxes.length).fill(false)
    );

    const handleOnChange = (position) =>
        setCheckedState(checkedState.map((item, index) =>
            index === position ? !item : item
        ));

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
            <p className='text-white mt-4 pt-2 border-t-2 border-indigo-300'>First time here? Please read the  <Link key="userGuide" href="/userguide"><a className="text-indigo-400 font-semibold underline hover:cursor-pointer"> User Guide</a></Link></p>
            <div className="mt-3 sm:mt-6 text-white text-sm">
                <SubmitButton isDisabled={!checkedState.every(x => x === true)} isSubmitting={false} onClick={() => onConfirm()}>
                    Confirm
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default ConfirmationModal;