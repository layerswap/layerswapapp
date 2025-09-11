import { SwapFormValues } from '../DTOs/SwapFormValues';
import { Dispatch, FC, SetStateAction } from 'react';
import Modal from '../modal/modal';
import { roundDecimals, truncateDecimals } from '../utils/RoundDecimals';
import { useFormikContext } from 'formik';
import useSWRBalance from '../../lib/balances/useSWRBalance';
import { useQuoteData } from '@/hooks/useFee';
import GasIcon from '../icons/GasIcon';

type RefuelModalProps = {
    openModal: boolean,
    setOpenModal: Dispatch<SetStateAction<boolean>>
    fee: ReturnType<typeof useQuoteData>['quote']
}

const RefuelModal: FC<RefuelModalProps> = ({ openModal, setOpenModal, fee }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const { to, toAsset: toCurrency, refuel, destination_address } = values || {};

    const nativeAsset = to?.token
    const { balances } = useSWRBalance(destination_address, to)
    const destNativeTokenBalance = balances?.find(b => b.token === nativeAsset?.symbol && b.network === to?.name)

    return (
        <Modal height="fit" show={openModal} setShow={setOpenModal} modalId={"refuel"}>
            <div className="flex flex-col items-center gap-2 text-center space-y-3">
                <div className="relative z-10 flex items-center justify-center rounded-xl p-3 bg-secondary-500">
                    <GasIcon className="h-[52px] w-[52px] text-primary-200" aria-hidden="true" />
                </div>
                <p className="text-2xl">About Refuel</p>
                <p className="text-secondary-text max-w-sm">
                    <span><span>We'll convert</span> <span>${fee?.refuel?.amount_in_usd}</span> <span>of your transfer into</span> <span>{nativeAsset?.symbol}</span> <span>so you can start using your funds on the destination chain immediately.</span></span>
                </p>
                {
                    (refuel || destNativeTokenBalance) &&
                    <div className="flex flex-col space-y-2 w-full bg-secondary-700 overflow-hidden ">
                        {
                            destNativeTokenBalance &&
                            <div className="gap-4 flex relative items-center outline-hidden w-full text-primary-text px-4 py-3 bg-secondary-500 rounded-xl">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-secondary-text">
                                        <span>Current balance</span>
                                    </div>
                                    <p className='text-end'>
                                        <span>{truncateDecimals(destNativeTokenBalance.amount, nativeAsset?.precision)} {nativeAsset?.symbol}</span>
                                    </p>
                                </div>
                            </div>
                        }
                        {
                            toCurrency?.refuel && nativeAsset &&
                            <div className="gap-4 flex relative items-center outline-hidden w-full text-primary-text px-4 py-3 bg-secondary-500 rounded-xl">
                                <div className="flex items-center justify-between w-full">
                                    <div className="text-secondary-text">
                                        You will receive
                                    </div>
                                    <p>
                                        <span>{roundDecimals(toCurrency.refuel?.amount, nativeAsset.precision)} {nativeAsset?.symbol}</span>
                                    </p>
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        </Modal>
    )
}

export default RefuelModal
