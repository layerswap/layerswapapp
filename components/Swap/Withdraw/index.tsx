import { FC } from 'react'
import ManualTransfer from './ManualTransfer';
import { useSwapDataState } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import SwapSummary from '../Summary';
import External from './External';
import { useQueryState } from '../../../context/query';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import Link from 'next/link';
import WalletTransferButton from './WalletTransferButton';

const Withdraw: FC<{ type: 'widget' | 'contained' }> = ({ type }) => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { appName, signature } = useQueryState()
    const sourceIsImmutableX = swap?.source_network.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)

    let withdraw: {
        header?: JSX.Element | JSX.Element[],
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
    } = {}

    if (swap?.use_deposit_address === false) {
        withdraw = {
            footer: <WalletTransferButton />
        }
    } else if (swap?.use_deposit_address === true) {
        withdraw = {
            header: <p className="text-md text-secondary-text">  <span>Transfer assets to Layerswap’s deposit address to complete the swap.</span> <Link target="_blank" className="text-primary-text underline hover:no-underline decoration-primary-text cursor-pointer" href='https://intercom.help/layerswap/en/articles/8448449-transferring-manually'>Learn more</Link></p>,
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
                    <div className='grid grid-cols-1 gap-3'>
                        {withdraw?.header}
                        <SwapSummary />
                        <SwapQuoteDetails swapResponse={swapResponse} />
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