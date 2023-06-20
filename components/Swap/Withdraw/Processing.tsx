import { ExternalLink } from 'lucide-react';
import { FC } from 'react'
import { useSwapDataState } from '../../../context/swap';
import { useSettingsState } from '../../../context/settings';
import { GetSwapStep } from '../../utils/SwapStatus';
import { SwapStep } from '../../../Models/Wizard';
import KnownInternalNames from '../../../lib/knownIds';
import Widget from '../../Wizard/Widget';
import shortenAddress from '../../utils/ShortenAddress';
import Steps from '../StepsComponent';
import SwapSummary from '../Summary';


const Processing: FC = () => {

    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    const source_display_name = swap?.source_exchange ? settings?.exchanges?.find(e => e.internal_name == swap?.source_exchange)?.display_name : settings?.networks?.find(e => e.internal_name == swap?.source_network)?.display_name

    const swapStep = GetSwapStep(swap)

    const source_network = settings.networks?.find(e => e.internal_name === swap.source_network)
    const destination_network = settings.networks?.find(e => e.internal_name === swap.destination_network)
    const input_tx_explorer = source_network?.transaction_explorer_template
    const output_tx_explorer = destination_network?.transaction_explorer_template

    const isStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet
        || swap?.destination_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet
        || swap?.destination_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetGoerli
        || swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetGoerli

    const progress = [
        {
            name: swapStep === SwapStep.TransactionDone ? 'Detecting your transfer' : `Transfer from ${source_display_name} is completed`,
             status: swapStep !== SwapStep.TransactionDone ? 'complete' : 'current', 

             description: swapStep !== SwapStep.TransactionDone ?
                <div className='flex items-center space-x-1'>
                    <span>Source Tx </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={input_tx_explorer.replace("{0}", swap?.input_transaction.transaction_id)}>{shortenAddress(swap.input_transaction.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
                :
                <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
        },
        {
            name: (swapStep === SwapStep.TransactionDone && 'Transfer confirmation')
                || (swapStep === SwapStep.TransactionDetected && ' Waiting for the transfer to get confirmed')
                || (swapStep === SwapStep.LSTransferPending && 'The transfer is confirmed'),
            status: (swapStep === SwapStep.TransactionDetected && 'current')
                || (swapStep === SwapStep.LSTransferPending && 'complete')
                || (swapStep === SwapStep.TransactionDone && 'upcoming'),
            description: (swapStep === SwapStep.TransactionDetected
                || swapStep === SwapStep.LSTransferPending) ? <div>Confirmations: <span className='text-white'>{((swap?.input_transaction?.confirmations >= swap?.input_transaction?.max_confirmations) ? swap?.input_transaction?.max_confirmations : swap?.input_transaction?.confirmations) ?? 0}</span>/{swap?.input_transaction?.max_confirmations}</div> : ""
        },
        {
            name: swapStep === SwapStep.LSTransferPending ? 'Your assets are on their way' : 'Transfer of assets to your address',
            status: (swapStep === SwapStep.TransactionDone
                || swapStep === SwapStep.TransactionDetected) ? 'upcoming' : 'current',
            description:
                swap?.output_transaction ? <div className='flex items-center space-x-1'>
                    <span>Destination Tx </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={output_tx_explorer.replace("{0}", swap?.output_transaction.transaction_id)}>{shortenAddress(swap.output_transaction.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
                    :
                    <div>
                        {
                            destination_network?.internal_name === KnownInternalNames.Networks.StarkNetMainnet ?
                                <span>Estimated time: 20-60 minutes</span>
                                :
                                <span>Estimated time: 2 minutes</span>
                        }
                    </div>
        },
    ]

    if (!swap) return <></>

    return (
        <Widget.Content>
            <div className="w-full min-h-[422px] space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className='mb-6 grid grid-cols-1 gap-4 space-y-4'>
                        {
                            <SwapSummary />
                        }
                        <div className="w-full flex flex-col h-full space-y-5">
                            <div className="text-left text-primary-text mt-4 space-y-2">
                                <p className="block sm:text-lg font-medium text-white">
                                    Transfer status
                                </p>
                                <p className='text-sm flex space-x-1'>
                                    Assets will be sent as soon as the transfer is confirmed
                                </p>
                            </div>
                            <div className='flex flex-col h-full justify-center'>
                                <Steps steps={progress} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Widget.Content>
    )
}

export default Processing;
