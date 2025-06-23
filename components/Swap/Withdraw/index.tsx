import { FC } from 'react'
import ManualTransfer from './ManualTransfer';
import { useSwapDataState } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import SwapSummary from '../Summary';
import External from './External';
import { useQueryState } from '../../../context/query';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';
import ManualTransferNote from './Wallet/Common/manualTransferNote';

const Withdraw: FC<{ type: 'widget' | 'contained' }> = ({ type }) => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { appName, signature } = useQueryState()
    const { source_network } = swap || {}
    const sourceIsImmutableX = swap?.source_network.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)

    let withdraw: {
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
    } = {}

    if (swap?.use_deposit_address === false) {
        withdraw = {
            content: <WalletTransferButton />
        }
    } else if (swap?.use_deposit_address === true) {
        withdraw = {
            footer: <ManualTransfer />,
            content: <></>
        }
    }

    if (isImtblMarketplace) {
        withdraw = {
            content: <External />
        }
    }

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between  text-secondary-text">
                    <div className='grid grid-cols-1 gap-3 '>
                        <SwapSummary />
                        <SwapQuoteDetails swapResponse={swapResponse} />
                        <div>
                            {withdraw?.content}
                        </div>
                    </div>
                    {
                        source_network?.deposit_methods?.some(m => m === 'deposit_address') &&
                        <div className="flex justify-center">
                            <ManualTransferNote />
                        </div>
                    }
                </div>
            </Widget.Content>
            {
                withdraw?.footer &&
                <Widget.Footer sticky={type == 'widget'}>
                    {withdraw?.footer}
                </Widget.Footer>
            }
        </>
    )
}


export default Withdraw