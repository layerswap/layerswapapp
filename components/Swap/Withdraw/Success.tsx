import { ExternalLink } from 'lucide-react';
import { Home } from 'lucide-react';
import { FC, useCallback } from 'react'
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';
import MessageComponent from '../../MessageComponent';
import Widget from '../../Wizard/Widget';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import GoHomeButton from '../../utils/GoHome';
import SwapSummary from '../Summary';
import { useQueryState } from '../../../context/query';
import { truncateDecimals } from '../../utils/RoundDecimals';
import { TransactionType } from '../../../lib/layerSwapApiClient';



const Success: FC = () => {
    const { networks } = useSettingsState()
    const { swap } = useSwapDataState()
    const { externalId } = useQueryState()
    const { destination_network: destination_network_internal_name } = swap
    const destination_network = networks.find(n => n.internal_name === destination_network_internal_name)
    const transaction_explorer_template = destination_network?.transaction_explorer_template
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)

    const handleViewInExplorer = useCallback(() => {
        if (!transaction_explorer_template)
            return
        window.open(transaction_explorer_template.replace("{0}", swapOutputTransaction?.transaction_id), '_blank')
    }, [transaction_explorer_template])

    return (
        <>
            <Widget.Content>
                <SwapSummary />
                <MessageComponent>
                    <MessageComponent.Content icon='green'>
                        <MessageComponent.Header>
                            Swap completed
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            {
                                swap?.destination_network ?
                                    <span>Your swap was successfully completed. {swapOutputTransaction?.amount} {swap?.destination_network_asset} has been sent to your address.</span>
                                    :
                                    <span>Your swap was successfully completed. Your assets are on their way to your exchange account.</span>
                            }
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                </MessageComponent>
            </Widget.Content>
            <Widget.Footer>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-white text-base space-x-2">
                        {!externalId &&
                            ((transaction_explorer_template && swapOutputTransaction?.transaction_id) ?
                                <>
                                    <div className='grow'>
                                        <SubmitButton text_align='left' buttonStyle='filled' isDisabled={false} isSubmitting={false} onClick={handleViewInExplorer} icon={<ExternalLink className='h-5 w-5' />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-light'
                                                primaryText='Explorer'
                                                secondarytext='View in'
                                            />
                                        </SubmitButton>
                                    </div>
                                    <div className='group basis-2/3 grow '>
                                        <GoHomeButton>
                                            <SubmitButton button_align='right' text_align='left' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                                <DoubleLineText
                                                    colorStyle='mltln-text-dark'
                                                    primaryText='Swap'
                                                    secondarytext='Do another'
                                                />
                                            </SubmitButton>
                                        </GoHomeButton>
                                    </div>
                                </>
                                :
                                <div className='grow'>
                                    <GoHomeButton>
                                        <SubmitButton className='plausible-event-name=Swap+more' text_align='center' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                            Swap more
                                        </SubmitButton>
                                    </GoHomeButton>
                                </div>)
                        }
                        {
                            externalId && transaction_explorer_template && swapOutputTransaction?.transaction_id &&
                            <div className='grow'>
                                <SubmitButton text_align='center' buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={handleViewInExplorer} icon={<ExternalLink className='h-5 w-5' />}>
                                    View in explorer
                                </SubmitButton>
                            </div>
                        }
                    </div>
                </MessageComponent.Buttons>
            </Widget.Footer>
        </>
    )
}

export default Success;