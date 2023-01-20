import { ExternalLinkIcon } from '@heroicons/react/outline';
import { HomeIcon } from '@heroicons/react/solid';
import { FC, useCallback } from 'react'
import { useAuthState, UserType } from '../../../context/authContext';
import { FormWizardProvider, useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSettingsState } from '../../../context/settings';
import { useSwapDataState } from '../../../context/swap';
import { GetSourceDestinationData } from '../../../helpers/swapHelper';
import { AuthStep } from '../../../Models/Wizard';
import SubmitButton, { DoubleLineText } from '../../buttons/submitButton';
import GuestCard from '../../guestCard';
import MessageComponent from '../../MessageComponent';
import GoHomeButton from '../../utils/GoHome';

const SuccessfulStep: FC = () => {
    const { networks, currencies, exchanges, discovery: { resource_storage_url } } = useSettingsState()
    const { swap } = useSwapDataState()
    const { destination_network } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })
    const { userType } = useAuthState()
    const { goToStep } = useFormWizardaUpdate()
    const GoToCodeStep = useCallback(() => goToStep(AuthStep.Code), [])

    const transaction_explorer_template = destination_network?.transaction_explorer_template

    const handleViewInExplorer = useCallback(() => {
        if (!transaction_explorer_template)
            return
        window.open(transaction_explorer_template.replace("{0}", swap?.output_transaction?.transaction_id), '_blank')
    }, [transaction_explorer_template])

    return (
        <>
            <MessageComponent>
                <MessageComponent.Content icon='green'>
                    <MessageComponent.Header>
                        Swap completed
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        {
                            swap?.destination_network ?
                                <span>Your swap was successfully completed. Go ahead, swap more!</span>
                                :
                                <span>Your swap was successfully completed. Your assets are on their way to your exchange account.</span>
                        }
                    </MessageComponent.Description>
                    {
                        userType && userType != UserType.AuthenticatedUser &&
                        <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} noToolBar hideMenu>
                            <GuestCard />
                        </FormWizardProvider>
                    }
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-white text-base space-x-2">
                        {
                            (transaction_explorer_template && swap?.output_transaction?.transaction_id) ?
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
                                            <SubmitButton button_align='right' text_align='left' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
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
                                        <SubmitButton className='plausible-event-name=Swap+more' text_align='center' buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}>
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