import { ArrowRightIcon, ExternalLinkIcon } from '@heroicons/react/outline';
import { FC, useCallback } from 'react'
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';
import { SwapType } from '../../../lib/layerSwapApiClient';
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import GoHomeButton from '../../utils/GoHome';

const SuccessfulStep: FC = () => {
    const { networks } = useSettingsState()
    const { swap } = useSwapDataState()

    const network = networks?.find(n => n.currencies.some(nc => nc.id === swap?.network_currency_id))

    const handleViewInExplorer = useCallback(() => {
        if (!network)
            return
        const { transaction_explorer_template } = network
        window.open(transaction_explorer_template.replace("{0}", swap?.transaction_id), '_blank')
    }, [network])

    return (
        <>
            <MessageComponent>
                <MessageComponent.Content icon='green'>
                    <MessageComponent.Header>
                        Swap completed
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        {
                            swap?.type === SwapType.OnRamp ?
                                <span>Your swap successfully completed. You can view it in the explorer, or go ahead swap more!</span>
                                :
                                <span>Your swap successfully completed. Your assets are on their way to your exchange account.</span>
                        }
                    </MessageComponent.Description>
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    {
                        networks && swap?.type === SwapType.OnRamp && swap?.transaction_id &&
                        <SubmitButton buttonStyle='filled' isDisabled={false} isSubmitting={false} onClick={handleViewInExplorer}>View in Explorer <ExternalLinkIcon className='ml-2 h-5 w-5' /></SubmitButton>
                    }
                    <GoHomeButton>
                        <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false}>Swap more <ArrowRightIcon className='ml-2 h-5 w-5' /></SubmitButton>
                    </GoHomeButton>
                </MessageComponent.Buttons>
            </MessageComponent>
        </>
    )
}

export default SuccessfulStep;