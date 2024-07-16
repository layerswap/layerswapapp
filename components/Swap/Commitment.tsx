import { FC, useCallback } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState } from '../../context/swap';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import { BackendTransactionStatus, TransactionType } from '../../lib/layerSwapApiClient';
import { SwapStatus } from '../../Models/SwapStatus';
import GasDetails from '../gasDetails';

type Props = {
    type: "widget" | "contained",
}
import { useSwapTransactionStore } from '../../stores/swapTransactionStore';
import SubmitButton from '../buttons/submitButton';

const SwapDetails: FC<Props> = ({ type }) => {

    


    return (
        <>
            <Container type={type}>
                <>
                    <Widget.Content>
                        <div className="w-full flex flex-col justify-between  text-secondary-text">
                            <div className='grid grid-cols-1 gap-4 '>
                                <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4">
                                    {
                                        //TODO SWP DETAILS
                                    }
                                </div>
                                <span>
                                    {
                                        //CONNECTED WALLET
                                    }
                                </span>
                            </div>
                        </div>
                    </Widget.Content>
                    {
                        <Widget.Footer sticky={true}>
                            {
                                //ACTIONS
                            }
                        </Widget.Footer>
                    }
                </>
            </Container>
        </>
    )
}

const Container = ({ type, children }: Props & {
    children: JSX.Element | JSX.Element[]
}) => {
    if (type === "widget")
        return <Widget><>{children}</></Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
            {children}
        </div>

}

export default SwapDetails