import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import SwapSummary from '../Summary';
import External from './External';
import { useQueryState } from '../../../context/query';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';

const Withdraw: FC<{ type: 'widget' | 'contained' }> = ({ type }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading } = useSwapDataState()
    const { appName, signature } = useQueryState()
    const sourceIsImmutableX = swapBasicData?.source_network.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swapBasicData?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)

    let withdraw: {
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
    } = {}

    if (swapBasicData?.use_deposit_address === false) {
        withdraw = {
            footer: <WalletTransferButton swapBasicData={swapBasicData} swapId={swapDetails?.id} refuel={!!refuel} />
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
                        <SwapQuoteDetails swapBasicData={swapBasicData} quote={quote} refuel={refuel} quoteIsLoading={quoteIsLoading} />
                        {withdraw?.content}
                    </div>
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