import { ExternalLink } from 'lucide-react';
import { FC } from 'react'
import KnownInternalNames from '../../../../lib/knownIds';
import Widget from '../../../Wizard/Widget';
import shortenAddress from '../../../utils/ShortenAddress';
import Steps from '../../StepsComponent';
import SwapSummary from '../../Summary';
import { GetNetworkCurrency } from '../../../../helpers/settingsHelper';
import AverageCompletionTime from '../../../Common/AverageCompletionTime';
import { SwapItem, Transaction, TransactionStatus, TransactionType } from '../../../../lib/layerSwapApiClient';
import { truncateDecimals } from '../../../utils/RoundDecimals';
import { LayerSwapAppSettings } from '../../../../Models/LayerSwapAppSettings';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { SwapFailReasons } from '../../../../Models/RangeError';
import { Gauge } from '../../../gauge';
import Failed from '../Failed';

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

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))?.[swap?.id]
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    const nativeCurrency = destination_layer?.isExchange === false && settings?.currencies?.find(c => c.asset === destination_layer?.native_currency)
    const truncatedRefuelAmount = truncateDecimals(swapRefuelTransaction?.amount, nativeCurrency?.precision)

    const progressStatuses = getProgressStatuses(swap, swapStatus)
    const stepStatuses = progressStatuses.stepStatuses;

    type ProgressStates = {
        [key in Progress]?: {
            [key in ProgressStatus]?: {
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
                description: <span><span>Estimated time:&nbsp;</span><span className='text-white'><span>less than&nbsp;</span><span>{(swap?.source_exchange || isStarknet) ? '10' : '3'}</span><span>&nbsp;minutes</span></span></span>
            },
            current: {
                name: 'Processing your deposit',
                description: <div>
                    <span>
                        <span>Waiting for confirmations</span>
                        {swapInputTransaction && swapInputTransaction.confirmations && (
                            <span className="text-white ml-1">
                                <span>{swapInputTransaction.confirmations >= swapInputTransaction.max_confirmations
                                    ? swapInputTransaction.max_confirmations
                                    : swapInputTransaction.confirmations}</span>
                                <span>/</span>{swapInputTransaction.max_confirmations}
                            </span>
                        )}
                    </span>
                </div>
            },
            complete: {
                name: `Your deposit is confirmed`,
                description: <div className='flex items-center space-x-1'>
                    <span>Transaction: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={input_tx_explorer.replace("{0}", swapInputTransaction?.transaction_id)}>{shortenAddress(swapInputTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            failed: {
                name: `The transfer failed`,
                description: <div className='flex space-x-1'>
                    <span>Error: </span>
                    <div className='space-x-1 text-white'>
                        {swap?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ?
                            "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                            :
                            swap?.fail_reason == SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ?
                                "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                :
                                "Something went wrong while processing the transfer. Please contact support"
                        }
                    </div>
                </div>
            },
            delayed: {
                name: `This transfer is being delayed by Coinbase`,
                description: null
            }
        },
        "output_transfer": {
            upcoming: {
                name: `Sending ${destinationNetworkCurrency?.name} to your address`,
                description: <span><span>Estimated time:&nbsp;</span><span className='text-white'><span>less than&nbsp;</span><span>{(swap?.source_exchange || isStarknet) ? '10' : '3'}</span><span>&nbsp;minutes</span></span></span>
            },
            current: {
                name: `Sending ${destinationNetworkCurrency?.name} to your address`,
                description: <span><span>Estimated time:&nbsp;</span><span className='text-white'><span>less than&nbsp;</span><span>{(swap?.source_exchange || isStarknet) ? '10' : '3'}</span><span>&nbsp;minutes</span></span></span>
            },
            complete: {
                name: `${swapOutputTransaction?.amount} ${swap?.destination_network_asset} was sent to your address`,
                description: swapOutputTransaction ? <div className="flex flex-col">
                    <div className='flex items-center space-x-1'>
                        <span>Transaction: </span>
                        <div className='underline hover:no-underline flex items-center space-x-1'>
                            <a target={"_blank"} href={output_tx_explorer.replace("{0}", swapOutputTransaction.transaction_id)}>{shortenAddress(swapOutputTransaction.transaction_id)}</a>
                            <ExternalLink className='h-4' />
                        </div>
                    </div>
                </div> : outputPendingDetails,
            },
            failed: {
                name: swap?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? `The transfer is on hold` : "The transfer is failed",
                description: <div className='flex space-x-1'>
                    <div className='space-x-1 text-primary-text'>
                        {swap?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ?
                            "Your deposit is higher than the max limit. We'll review and approve your transaction in up to 2 hours."
                            :
                            swap?.fail_reason == SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE ?
                                "Your deposit is lower than the minimum required amount. Unfortunately, we can't process the transaction. Please contact support to check if you're eligible for a refund."
                                :
                                "Something went wrong while processing the transfer. Please contact support"
                        }
                    </div>
                </div>
            },
            delayed: {
                name: `This swap is being delayed by Coinbase`,
                description: null
            }
        },
        "refuel": {
            upcoming: {
                name: `Sending ${nativeCurrency?.asset} to your address`,
                description: <span><span>Estimated time:&nbsp;</span><span className='text-white'><span>less than&nbsp;</span><span>{(swap?.source_exchange || isStarknet) ? '10' : '3'}</span><span>&nbsp;minutes</span></span></span>
            },
            current: {
                name: `Sending ${nativeCurrency?.asset} to your address`,
                description: <span><span>Estimated time:&nbsp;</span><span className='text-white'><span>less than&nbsp;</span><span>{(swap?.source_exchange || isStarknet) ? '10' : '3'}</span><span>&nbsp;minutes</span></span></span>
            },
            complete: {
                name: `${truncatedRefuelAmount} ${nativeCurrency?.asset} was sent to your address`,
                description: <div className='flex items-center space-x-1'>
                    <span>Transaction: </span>
                    <div className='underline hover:no-underline flex items-center space-x-1'>
                        <a target={"_blank"} href={swapRefuelTransaction?.explorer_url}>{shortenAddress(swapRefuelTransaction?.transaction_id)}</a>
                        <ExternalLink className='h-4' />
                    </div>
                </div>
            },
            delayed: {
                name: `This transfers is being delayed`,
                description: null
            }
        }
    }

    const allSteps: StatusStep[] = [
        {
            name: progressStates["input_transfer"][stepStatuses?.input_transfer]?.name,
            status: stepStatuses?.input_transfer,
            description: progressStates["input_transfer"][stepStatuses?.input_transfer]?.description,
            index: 1
        },
        {
            name: progressStates["output_transfer"][stepStatuses?.output_transfer]?.name,
            status: stepStatuses?.output_transfer,
            description: progressStates["output_transfer"][stepStatuses?.output_transfer]?.description,
            index: 2
        },
        {
            name: progressStates["refuel"][stepStatuses?.refuel]?.name,
            status: stepStatuses?.refuel,
            description: progressStates["refuel"][stepStatuses?.refuel]?.description,
            index: 3
        }
    ]

    let currentSteps = allSteps.filter((s) => s.status);
    let stepsProgressPercentage = currentSteps.filter(x => x.status == ProgressStatus.Complete).length / currentSteps.length * 100;

    if (!swap) return <></>
    return (
        <Widget.Content>
            <div className={`w-full ${swap?.status != SwapStatus.Cancelled && swap?.status != SwapStatus.Expired ? "min-h-[422px]" : ""} space-y-5 flex flex-col justify-between h-full text-primary-text`}>
                <div className='space-y-5'>
                    <SwapSummary />
                    <div className="w-full flex flex-col h-full space-y-5">
                        <div className="bg-secondary-700 font-normal px-3 py-4 rounded-lg flex flex-col border border-secondary-500 w-full relative z-10">
                            {
                                swap?.status != SwapStatus.Cancelled && swap?.status != SwapStatus.Expired && currentSteps.find(x => x.status != null) &&
                                <div className='flex flex-col h-full justify-center'>
                                    <Steps steps={currentSteps} />
                                </div>
                            }
                            {
                                ([SwapStatus.Expired, SwapStatus.Cancelled, SwapStatus.UserTransferDelayed].includes(swap?.status)) &&
                                <Failed />
                            }

                        </div>
                    </div>
                    <div className="bg-secondary-700 font-normal px-3 py-4 rounded-lg flex flex-col border border-secondary-500 w-full relative z-10">
                        <div className='flex flex-col gap-2 items-center'>
                            <div className='flex items-center'>
                                <Gauge value={stepsProgressPercentage} size="small" completeOnFinish={true} />
                            </div>
                            <div className="flex-col text-primary-text text-center ">
                                <span className="font-medium text-white">
                                    {progressStatuses.generalStatus.title}
                                </span>
                                <span className='text-sm block space-x-1'>
                                    <span>{progressStatuses.generalStatus.subTitle}</span>
                                </span>
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
    OutputTransfer = 'output_transfer'
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


const getProgressStatuses = (swap: SwapItem, swapStatus: SwapStatus): { stepStatuses: { [key in Progress]: ProgressStatus }, generalStatus: { title: string, subTitle: string } } => {
    let generalTitle = "Transfer in progress";
    let subtitle = "You can view individual transactions above";

    const swapInputTransaction: Transaction | string = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))?.[swap?.id];
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output);
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel);
    let inputIsCompleted = (swapInputTransaction as Transaction)?.status == TransactionStatus.Completed && (swapInputTransaction as Transaction).confirmations >= (swapInputTransaction as Transaction).max_confirmations;

    let input_transfer = inputIsCompleted ? ProgressStatus.Complete : ProgressStatus.Current;

    let output_transfer =
        (!swapOutputTransaction && inputIsCompleted) || swapOutputTransaction?.status == TransactionStatus.Pending ? ProgressStatus.Current
            : swapOutputTransaction?.status == TransactionStatus.Initiated || swapOutputTransaction?.status == TransactionStatus.Completed ? ProgressStatus.Complete
                : ProgressStatus.Upcoming;

    let refuel_transfer =
        (swap.has_refuel && !swapRefuelTransaction) ? ProgressStatus.Upcoming
            : swapRefuelTransaction?.status == TransactionStatus.Pending ? ProgressStatus.Current
                : swapRefuelTransaction?.status == TransactionStatus.Initiated || swapRefuelTransaction?.status == TransactionStatus.Completed ? ProgressStatus.Complete
                    : null;

    if (swapStatus === SwapStatus.Failed) {
        output_transfer = output_transfer == ProgressStatus.Complete ? ProgressStatus.Complete : ProgressStatus.Failed;
        refuel_transfer = refuel_transfer !== ProgressStatus.Complete && null;
        generalTitle = swap?.fail_reason == SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE ? "Transfer on hold" : "Transfer failed";
        subtitle = "View instructions above"
    }

    if (swapStatus === SwapStatus.UserTransferDelayed) {
        input_transfer = null;
        output_transfer = null;
        refuel_transfer = null;
        generalTitle = "Transfer delayed"
        subtitle = "View instructions above"
    }

    if (swapStatus == SwapStatus.Completed) {
        generalTitle = "Transfer completed"
    }
    if (swapStatus == SwapStatus.Cancelled) {
        generalTitle = "Transfer cancelled"
        subtitle = ""
    }
    if (swapStatus == SwapStatus.Expired) {
        generalTitle = "Transfer expired"
        subtitle = ""
    }

    return {
        stepStatuses: {
            "input_transfer": input_transfer,
            "output_transfer": output_transfer,
            "refuel": refuel_transfer,
        },
        generalStatus: {
            title: generalTitle,
            subTitle: subtitle
        }
    };

}

export default Processing;
