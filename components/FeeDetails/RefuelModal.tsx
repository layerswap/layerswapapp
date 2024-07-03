import { SwapFormValues } from '../DTOs/SwapFormValues';
import { Dispatch, FC, SetStateAction, useMemo } from 'react';
import useWallet from '../../hooks/useWallet';
import { useBalancesState } from '../../context/balances';
import Modal from '../modal/modal';
import { Fuel } from 'lucide-react';
import { roundDecimals, truncateDecimals } from '../utils/RoundDecimals';
import SubmitButton from '../buttons/submitButton';
import SecondaryButton from '../buttons/secondaryButton';
import { useFormikContext } from 'formik';

type RefuelModalProps = {
    openModal: boolean,
    setOpenModal: Dispatch<SetStateAction<boolean>>
}

const RefuelModal: FC<RefuelModalProps> = ({ openModal, setOpenModal }) => {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { to, toCurrency, refuel } = values || {};

    const { getAutofillProvider: getProvider } = useWallet()
    const { balances } = useBalancesState()

    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const nativeAsset = to?.token
    const connectedWallet = provider?.getConnectedWallet()
    const destNativeTokenBalance = balances[connectedWallet?.address || '']?.find(b => b.token === nativeAsset?.symbol && b.network === to?.name)
    const amountInUsd = (destNativeTokenBalance && nativeAsset) ? (destNativeTokenBalance.amount * nativeAsset.price_in_usd).toFixed(2) : undefined

    const closeModal = () => {
        setOpenModal(false)
    }

    const enabldeRefuel = () => {
        setFieldValue('refuel', true)
        setOpenModal(false)
    }

    return (
        <Modal height="fit" show={openModal} setShow={setOpenModal} modalId={"refuel"}>
            <div className="flex flex-col items-center gap-6 mt-2">
                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-xl p-2 bg-primary/20">
                    <Fuel className="h-16 w-16 text-primary" aria-hidden="true" />
                </div>
                <div className="text-center max-w-72">
                    <p className="text-2xl">About Refuel</p>
                    <p className="text-secondary-text">
                        <span>You will get a small amount of</span> <span>{nativeAsset?.symbol}</span> <span>that you can use to pay for gas fees.</span>
                    </p>
                </div>
                {
                    (values.refuel || destNativeTokenBalance) &&
                    <div className="flex flex-col divide-y-2 divide-secondary-900 w-full rounded-lg bg-secondary-700 overflow-hidden">
                        {
                            destNativeTokenBalance &&
                            <div className="gap-4 flex relative items-center outline-none w-full text-primary-text px-4 py-3">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-secondary-text">
                                        <span>You have</span>
                                    </div>
                                    <p>
                                        <span>{truncateDecimals(destNativeTokenBalance.amount, nativeAsset?.precision)} {nativeAsset?.symbol}</span> <span className="text-secondary-text">(${amountInUsd})</span>
                                    </p>
                                </div>
                            </div>
                        }
                        {
                            toCurrency?.refuel && nativeAsset &&
                            <div className="gap-4 flex relative items-center outline-none w-full text-primary-text px-4 py-3">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-secondary-text">
                                        You will receive
                                    </div>
                                    <p>
                                        <span>{roundDecimals(toCurrency.refuel?.amount, nativeAsset.precision)} {nativeAsset?.symbol}</span> <span className="text-secondary-text">(${toCurrency.refuel?.amount_in_usd})</span>
                                    </p>
                                </div>
                            </div>
                        }
                    </div>
                }
                <div className='flex flex-col gap-3 w-full h-full'>
                    {
                        !refuel &&
                        <SubmitButton type="button" onClick={enabldeRefuel}>
                            Enable refuel
                        </SubmitButton>
                    }
                    <SecondaryButton type="button" className='h-full w-full py-3' onClick={closeModal}>
                        Close
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    )
}

export default RefuelModal