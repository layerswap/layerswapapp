import { SwapFormValues } from '../DTOs/SwapFormValues';
import { Fee } from '../../context/feeContext';
import { Dispatch, FC, SetStateAction, useMemo } from 'react';
import useWallet from '../../hooks/useWallet';
import { useBalancesState } from '../../context/balances';
import Modal from '../modal/modal';
import { Fuel } from 'lucide-react';
import { truncateDecimals } from '../utils/RoundDecimals';
import SubmitButton from '../buttons/submitButton';

type RefuelModalProps = {
    values: SwapFormValues
    openModal: boolean,
    setOpenModal: Dispatch<SetStateAction<boolean>>
    fee: Fee | undefined
}

const RefuelModal: FC<RefuelModalProps> = ({ values, openModal, setOpenModal, fee }) => {

    const { to } = values || {};

    const { getAutofillProvider: getProvider } = useWallet()
    const { balances } = useBalancesState()

    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const nativeAsset = to?.assets.find(a => a.is_native)
    const connectedWallet = provider?.getConnectedWallet()
    const destNativeTokenBalance = balances[connectedWallet?.address || '']?.find(b => b.token === nativeAsset?.asset && b.network === to?.internal_name)
    const amountInUsd = (destNativeTokenBalance && nativeAsset) ? (destNativeTokenBalance.amount * nativeAsset.usd_price).toFixed(2) : undefined

    return (
        <Modal height="fit" show={openModal} setShow={setOpenModal} modalId={"refuel"}>
            <div className="flex flex-col items-center gap-6 mt-2">
                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-xl p-2 bg-primary/20">
                    <Fuel className="h-16 w-16 text-primary" aria-hidden="true" />
                </div>
                <div className="text-center max-w-72">
                    <p className="text-2xl">About Refuel</p>
                    <p className="text-secondary-text">
                        <span>You will get a small amount of</span> <span>{nativeAsset?.asset}</span> <span>that you can use to pay for gas fees.</span>
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
                                        <span>{truncateDecimals(destNativeTokenBalance.amount, nativeAsset?.precision)} {nativeAsset?.asset}</span> <span className="text-secondary-text">(${amountInUsd})</span>
                                    </p>
                                </div>
                            </div>
                        }
                        {
                            values.refuel &&
                            <div className="gap-4 flex relative items-center outline-none w-full text-primary-text px-4 py-3">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-secondary-text">
                                        You will receive
                                    </div>
                                    <p>
                                        <span>{fee?.refuelAmount} {nativeAsset?.asset}</span> <span className="text-secondary-text">(${fee?.refuelAmountInUsd})</span>
                                    </p>
                                </div>
                            </div>
                        }
                    </div>
                }
                <SubmitButton type="button" onClick={() => setOpenModal(false)} isDisabled={false} isSubmitting={false}>
                    OK
                </SubmitButton>
            </div>
        </Modal>
    )
}

export default RefuelModal