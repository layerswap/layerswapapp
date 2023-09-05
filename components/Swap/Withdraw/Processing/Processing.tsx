import { ExternalLink, Fuel } from 'lucide-react';
import { FC } from 'react'
import KnownInternalNames from '../../../../lib/knownIds';
import Widget from '../../../Wizard/Widget';
import shortenAddress from '../../../utils/ShortenAddress';
import Steps from '../../StepsComponent';
import SwapSummary from '../../Summary';
import { GetNetworkCurrency } from '../../../../helpers/settingsHelper';
import AverageCompletionTime from '../../../Common/AverageCompletionTime';
import { SwapItem, TransactionStatus, TransactionType } from '../../../../lib/layerSwapApiClient';
import { truncateDecimals } from '../../../utils/RoundDecimals';
import { LayerSwapAppSettings } from '../../../../Models/LayerSwapAppSettings';
import { SwapStatus } from '../../../../Models/SwapStatus';

type Props = {
    settings: LayerSwapAppSettings;
    swap: SwapItem;
}

const Processing: FC<Props> = ({ settings, swap }) => {

    const swapStatus = swap.status;

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

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))[swap?.id]
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    const nativeCurrency = swapRefuelTransaction?.amount && destination_layer?.isExchange === false && settings?.currencies?.find(c => c.asset === destination_layer?.native_currency)
    const truncatedRefuelAmount = truncateDecimals(swapRefuelTransaction?.amount, nativeCurrency?.precision)

    const progressStatuses = getProgressStatuses(swap, swapStatus)

    type ProgressStates = {
        [key in Progress]: {
            [key in ProgressStatus]: {
                name: string;
                description: string | JSX.Element;
            }
        }
    }

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
                name: 'Waiting for your transfer',
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: 'Your transfer is in progress',
                description: <div>
                    <span>
                        Waiting for confirmations
                        {swapInputTransaction && (
                            <span className="text-white ml-1">
                                {swapInputTransaction.confirmations >= swapInputTransaction.max_confirmations
                                    ? swapInputTransaction.max_confirmations
                                    : swapInputTransaction.confirmations}
                                /{swapInputTransaction.max_confirmations}
                            </span>
                        )}
                    </span>
                </div>
            },
            complete: {
                name: `Your transfer is completed`,
                description: <div className='flex items-center space-x-1'>
                    <span>Explorer link: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={input_tx_explorer.replace("{0}", swapInputTransaction?.transaction_id)}>{shortenAddress(swapInputTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            failed: {
                name: `Your transfer is failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap.message}
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        This usually means that the exchange needs additional verification
                    </div>
                </div>
            }
        },
        "output_transfer": {
            upcoming: {
                name: `Sending ${destinationNetworkCurrency?.name} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: `Sending ${destinationNetworkCurrency?.name} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            complete: {
                name: `${swapOutputTransaction?.amount} ${swap?.destination_network_asset} was sent to your wallet`,
                description: swapOutputTransaction ? <div className="flex flex-col">
                    <div className='flex items-center space-x-1'>
                        <span>Explorer link: </span>
                        <div className='underline hover:no-underline flex items-center space-x-1'>
                            <a target={"_blank"} href={output_tx_explorer.replace("{0}", swapOutputTransaction.transaction_id)}>{shortenAddress(swapOutputTransaction.transaction_id)}</a>
                            <ExternalLink className='h-4' />
                        </div>
                    </div>
                </div> : outputPendingDetails,
            },
            failed: {
                name: `Your transfer is failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap.message}
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        This usually means that the exchange needs additional verification
                    </div>
                </div>
            }
        },
        "refuel": {
            upcoming: {
                name: `Sending ${nativeCurrency?.asset} to your wallet (Refuel)`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: `Sending ${nativeCurrency?.asset} to your wallet (Refuel)`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            complete: {
                name: `${truncatedRefuelAmount} ${nativeCurrency?.asset} was sent to your wallet (Refuel)`,
                description: <div className='flex items-center space-x-1'>
                    <span>Explorer link: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={swapRefuelTransaction?.explorer_url}>{shortenAddress(swapRefuelTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            failed: {
                name: `Your transfer is failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap.message}
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        This usually means that the exchange needs additional verification
                    </div>
                </div>
            }
        },
        "failed": {
            upcoming: {
                name: `Sending ${nativeCurrency?.asset} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: `Sending ${nativeCurrency?.asset} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            complete: {
                name: `${truncatedRefuelAmount} ${nativeCurrency?.asset} was sent to your wallet`,
                description: <div className='flex items-center space-x-1'>
                    <span>Explorer link: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={swapRefuelTransaction?.explorer_url}>{shortenAddress(swapRefuelTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            failed: {
                name: `Your transfer is failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap.message}
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        This usually means that the exchange needs additional verification
                    </div>
                </div>
            }
        },
        "delayed": {
            upcoming: {
                name: `Sending ${nativeCurrency?.asset} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            current: {
                name: `Sending ${nativeCurrency?.asset} to your wallet`,
                description: <span>Estimated time: <span className='text-white'>less than {(swap?.source_exchange || isStarknet) ? '10' : '3'} minutes</span></span>
            },
            complete: {
                name: `${truncatedRefuelAmount} ${nativeCurrency?.asset} was sent to your wallet`,
                description: <div className='flex items-center space-x-1'>
                    <span>Explorer link: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={swapRefuelTransaction?.explorer_url}>{shortenAddress(swapRefuelTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            failed: {
                name: `Your transfer is failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap.message}
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        This usually means that the exchange needs additional verification
                    </div>
                </div>
            }
        }
    }

    const progress: StatusStep[] = [
        {
            name: progressStates["input_transfer"][progressStatuses?.input_transfer]?.name,
            status: progressStatuses?.input_transfer,
            description: progressStates["input_transfer"][progressStatuses?.input_transfer]?.description,
            index: 1
        }
    ]

    if (swapOutputTransaction) {
        progress.push({
            name: progressStates["output_transfer"][progressStatuses?.output_transfer]?.name,
            status: progressStatuses?.output_transfer,
            description: progressStates["output_transfer"][progressStatuses?.output_transfer]?.description,
            index: 2
        })
    }

    if (swap?.has_refuel) {
        progress.push({
            name: progressStates["refuel"][progressStatuses?.refuel]?.name,
            status: progressStatuses?.refuel,
            description: progressStates["refuel"][progressStatuses?.refuel]?.description,
            index: swapOutputTransaction ? 3 : 2
        })
    }

    if (swap?.status == "failed") {
        progress.push({
            name: progressStates["failed"][progressStatuses?.failed]?.name,
            status: progressStatuses?.failed,
            description: progressStates["failed"][progressStatuses?.failed]?.description,
            index: swap?.has_refuel && swapOutputTransaction ? 4 : !swap?.has_refuel && swapOutputTransaction || swap?.has_refuel && !swapOutputTransaction ? 3 : 2
        })
    }

    if (swap?.status == "user_transfer_delayed") {
        progress.push({
            name: progressStates["delayed"][progressStatuses?.delayed]?.name,
            status: progressStatuses?.delayed,
            description: progressStates["delayed"][progressStatuses?.delayed]?.description,
            index: swap?.has_refuel && swapOutputTransaction ? 4 : !swap?.has_refuel && swapOutputTransaction || swap?.has_refuel && !swapOutputTransaction ? 3 : 2
        })
    }

    if (!swap) return <></>

    return (
        <Widget.Content>
            <div className="w-full min-h-[422px] space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className='grid grid-cols-1 gap-4 space-y-4'>
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
    Refuel = 'refuel',
    OutputTransfer = 'output_transfer',
    Failed = 'failed',
    Delayed = 'delayed'
}
enum ProgressStatus {
    Upcoming = 'upcoming',
    Current = 'current',
    Complete = 'complete',
    Failed = 'failed',
    Delayed = 'delayed'
}
type StatusStep = {
    name: string;
    status: ProgressStatus;
    description: string | JSX.Element;
    index?: number;
}


const getProgressStatuses = (swap: SwapItem, swapStatus: SwapStatus): { [key in Progress]: ProgressStatus } => {
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))[swap?.id];
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output);
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel);

    const input_transfer = swapInputTransaction?.status == TransactionStatus.Completed ? ProgressStatus.Complete : ProgressStatus.Current;
    let output_transfer = swapOutputTransaction?.status == TransactionStatus.Completed ? ProgressStatus.Complete : swapOutputTransaction.status == TransactionStatus.Initiated ? ProgressStatus.Current : ProgressStatus.Upcoming;
    let refuel_transfer = (swap.has_refuel && !swapRefuelTransaction) || swapRefuelTransaction?.status == TransactionStatus.Pending ? ProgressStatus.Upcoming : swapRefuelTransaction?.status == TransactionStatus.Initiated ? ProgressStatus.Current : swapRefuelTransaction?.status == TransactionStatus.Completed ? ProgressStatus.Complete : null;
    let failed = null;
    let delayed = null;

    if (swapStatus === SwapStatus.Failed) {
        failed = ProgressStatus.Failed;
        output_transfer = output_transfer !== ProgressStatus.Complete ? null : ProgressStatus.Complete;
        refuel_transfer = refuel_transfer !== ProgressStatus.Complete ? null : ProgressStatus.Complete;
    }

    if (swapStatus === SwapStatus.UserTransferDelayed) {
        delayed = ProgressStatus.Delayed;
    }

    return {
        "input_transfer": input_transfer,
        "output_transfer": output_transfer,
        "refuel": refuel_transfer,
        "failed": failed,
        "delayed": delayed
    };

}

export default Processing;
