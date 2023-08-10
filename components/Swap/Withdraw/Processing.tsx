import { ExternalLink, Fuel } from 'lucide-react';
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
import { GetNetworkCurrency } from '../../../helpers/settingsHelper';
import AverageCompletionTime from '../../Common/AverageCompletionTime';
import { TransactionType } from '../../../lib/layerSwapApiClient';




const Processing: FC = () => {

    const { swap } = useSwapDataState()
    const settings = useSettingsState()
    const source_display_name = swap?.source_exchange ? settings?.exchanges?.find(e => e.internal_name == swap?.source_exchange)?.display_name : settings?.networks?.find(e => e.internal_name == swap?.source_network)?.display_name

    const swapStep = GetSwapStep(swap)

    const source_network = settings.networks?.find(e => e.internal_name === swap.source_network)
    const destination_network = settings.networks?.find(e => e.internal_name === swap.destination_network)
    const destination_layer = settings.layers?.find(e => e.internal_name === swap.destination_network)
    const input_tx_explorer = source_network?.transaction_explorer_template
    const output_tx_explorer = destination_network?.transaction_explorer_template

    const isStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet
        || swap?.destination_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet
        || swap?.destination_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetGoerli
        || swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetGoerli

    const destinationNetworkCurrency = GetNetworkCurrency(destination_layer, swap?.destination_network_asset)

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    const progressStatuses = getProgressStatuses(swapStep)

    type ProgressStates = {
        [key in Progress]: {
            [key in ProgressStatus]: {
                name: string;
                description: string | JSX.Element;
            }
        }
    }

    const confirmationsDetails = <div>Confirmations: <span className='text-white'>{((swapInputTransaction?.confirmations >= swapInputTransaction?.max_confirmations) ? swapInputTransaction?.max_confirmations : swapInputTransaction?.confirmations) ?? 0}</span>/{swapInputTransaction?.max_confirmations}</div>
    const outputPendingDetails = <div className='flex items-center space-x-1'>
        <span>Estimated arrival:</span>
        <div className='text-white'>
            {
                destinationNetworkCurrency?.status == 'insufficient_liquidity' ?
                    <span>Up to 2 hours (delayed)</span>
                    :
                    <AverageCompletionTime time={destination_network?.average_completion_time} />
            }
        </div>
    </div>

    const progressStates: ProgressStates = {
        "input_transfer": {
            upcoming: {
                name: '1. Detecting your transfer',
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: '1. Detecting your transfer',
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            complete: {
                name: `1. Transfer from ${source_display_name} is completed`,
                description: <div className='flex items-center space-x-1'>
                    <span>Source Tx: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={input_tx_explorer.replace("{0}", swapInputTransaction?.transaction_id)}>{shortenAddress(swapInputTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
        },
        "confirmations": {
            upcoming: {
                name: '2. Transfer confirmation',
                description: ""
            },
            current: {
                name: '2. Waiting for the transfer to get confirmed',
                description: confirmationsDetails
            },
            complete: {
                name: '2. The transfer is confirmed',
                description: confirmationsDetails
            }
        },
        "output_transfer": {
            upcoming: {
                name: '3. Transfer of assets to your address',
                description: outputPendingDetails
            },
            current: {
                name: '3. Your assets are on their way',
                description: outputPendingDetails,
            },
            complete: {
                name: "3. Swap completed",
                description: swapOutputTransaction ? <div className="flex flex-col">
                    <div className='flex items-center space-x-1'>
                        <span>Destination Tx: </span>
                        <div className='underline hover:no-underline flex items-center space-x-1'>
                            <a target={"_blank"} href={output_tx_explorer.replace("{0}", swapOutputTransaction.transaction_id)}>{shortenAddress(swapOutputTransaction.transaction_id)}</a>
                            <ExternalLink className='h-4' />
                        </div>
                    </div>
                    {swap?.has_refuel &&
                        <div className='flex items-center'>
                            <div className='flex items-center'>
                                <p className='mr-1'>Refuel Tx:</p>
                            </div>
                            <div className='underline hover:no-underline flex items-center space-x-1'>
                                <a target={"_blank"} href={swapRefuelTransaction?.explorer_url}>{shortenAddress(swapRefuelTransaction?.transaction_id)}</a>
                                <ExternalLink className='h-4' />
                            </div>
                        </div>
                    }
                </div> : outputPendingDetails,
            }
        }
    }

    const progress: StatusStep[] = [
        {
            name: progressStates["input_transfer"][progressStatuses.input_transfer].name,
            status: progressStatuses.input_transfer,
            description: progressStates["input_transfer"][progressStatuses.input_transfer].description
        },
        {
            name: progressStates["confirmations"][progressStatuses.confirmations].name,
            status: progressStatuses.confirmations,
            description: progressStates["confirmations"][progressStatuses.confirmations].description
        },
        {
            name: progressStates["output_transfer"][progressStatuses.output_transfer].name,
            status: progressStatuses.output_transfer,
            description: progressStates["output_transfer"][progressStatuses.output_transfer].description
        }
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


enum Progress {
    InputTransfer = 'input_transfer',
    Confirmations = 'confirmations',
    OutputTransfer = 'output_transfer'
}
enum ProgressStatus {
    Upcoming = 'upcoming',
    Current = 'current',
    Complete = 'complete'
}
type StatusStep = {
    name: string;
    status: ProgressStatus;
    description: string | JSX.Element;
}


const getProgressStatuses = (swapStep: SwapStep): { [key in Progress]: ProgressStatus } => {
    if (swapStep <= SwapStep.TransactionDone) {
        return {
            "input_transfer": ProgressStatus.Current,
            "confirmations": ProgressStatus.Upcoming,
            "output_transfer": ProgressStatus.Upcoming,
        }
    }
    else if (swapStep === SwapStep.TransactionDetected) {
        return {
            "input_transfer": ProgressStatus.Complete,
            "confirmations": ProgressStatus.Current,
            "output_transfer": ProgressStatus.Upcoming
        }
    }
    else if (swapStep === SwapStep.LSTransferPending) {
        return {
            "input_transfer": ProgressStatus.Complete,
            "confirmations": ProgressStatus.Complete,
            "output_transfer": ProgressStatus.Current
        }
    }
    else {
        return {
            "input_transfer": ProgressStatus.Complete,
            "confirmations": ProgressStatus.Complete,
            "output_transfer": ProgressStatus.Complete
        }
    }
}


export default Processing;
