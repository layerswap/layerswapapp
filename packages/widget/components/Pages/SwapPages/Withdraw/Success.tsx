import { ExternalLink } from 'lucide-react';
import { Home } from 'lucide-react';
import { FC, useCallback } from 'react'
import { useSettingsState } from '../../../../context/settings';
import { useSwapDataState } from '../../../../context/swap';
import MessageComponent from '../../../Common/MessageComponent';
import { Widget } from '../../../Widget/Index';
import SubmitButton, { DoubleLineText } from '../../../Buttons/submitButton';
import GoHomeButton from '../../../utils/GoHome';
import { TransactionType } from '../../../../lib/layerSwapApiClient';
import AppSettings from '../../../../lib/AppSettings';
import { useQueryState } from '../../../../context/query';

const Success: FC = () => {
    const { networks: layers } = useSettingsState()
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { externalId } = useQueryState()
    const destination_network = layers.find(n => n.name === swap?.destination_network.name)
    const transaction_explorer_template = destination_network?.transaction_explorer_template
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)

    const handleViewInExplorer = useCallback(() => {
        if (!transaction_explorer_template)
            return
        window.open(`${AppSettings.ExplorerURl}/${swapOutputTransaction?.transaction_hash}`, '_blank')
    }, [transaction_explorer_template])

    return (
        <>
            <Widget.Footer>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-primary-text text-base space-x-2">
                        {!externalId &&
                            ((transaction_explorer_template && swapOutputTransaction?.transaction_hash) ?
                                <>
                                    <div className='grow'>
                                        <SubmitButton text_align='left' buttonStyle='filled' isDisabled={false} isSubmitting={false} onClick={handleViewInExplorer} icon={<ExternalLink className='h-5 w-5' />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-light'
                                                primaryText='View in Explorer'
                                                secondarytext=''
                                            />
                                        </SubmitButton>
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
                            externalId && transaction_explorer_template && swapOutputTransaction?.transaction_hash &&
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