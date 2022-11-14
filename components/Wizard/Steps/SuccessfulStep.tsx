import { ArrowRightIcon, ExternalLinkIcon } from '@heroicons/react/outline';
import { HomeIcon } from '@heroicons/react/solid';
import { FC, useCallback } from 'react'
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';
import { SwapType } from '../../../lib/layerSwapApiClient';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
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
                    <div className="flex flex-row text-white text-base space-x-2">
                        {
                            (networks && swap?.type === SwapType.OnRamp && swap?.transaction_id) ?
                                <>
                                    <div className='basis-1/3'>
                                        <SubmitButton text_align='left' buttonStyle='filled' isDisabled={false} isSubmitting={false} onClick={handleViewInExplorer} icon={<ExternalLinkIcon className='h-5 w-5' />}>
                                            <DoubleLineText
                                                colorStyle='mltln-text-light'
                                                primaryText='Explorer'
                                                secondarytext='View in'
                                            />
                                        </SubmitButton>
                                    </div>
                                    <div className='basis-2/3 grow '>
                                        <GoHomeButton>
                                            <SubmitButton text_align='left' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
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
                                        <SubmitButton text_align='center' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
                                            Swap more
                                        </SubmitButton>
                                    </GoHomeButton>
                                </div>
                        }

                    </div>
                </MessageComponent.Buttons>
            </MessageComponent>
        </>
    )
}

export default SuccessfulStep;