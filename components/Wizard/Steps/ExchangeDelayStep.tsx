import { BookOpenIcon, HomeIcon, InformationCircleIcon } from '@heroicons/react/outline';
import { FC } from 'react'
import SubmitButton from '../../buttons/submitButton';
import MessageComponent from '../../MessageComponent';
import GoHomeButton from '../../utils/GoHome';

const ExchangeDelay: FC = () => {

    return (
        <MessageComponent>
            <MessageComponent.Content icon='yellow'>
                <MessageComponent.Header>
                    Swap delayed
                </MessageComponent.Header>
                <MessageComponent.Description>
                    <p>This swap is being delayed by Coinbase. This usually means that the exchange needs additional verification.</p>
                    <div className='p-4 bg-darkblue-700 text-white rounded-lg border border-darkblue-500'>
                        <div className="flex items-center">
                            <InformationCircleIcon className='h-5 w-5 text-primary-600 mr-3' />
                            <label className="block text-sm md:text-base font-medium leading-6">What to do?</label>
                        </div>
                        <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-left">
                            <li>Check your email for details from Coinbase</li>
                            <li>Check your Coinbase account's transfer history</li>
                        </ul>
                    </div>
                </MessageComponent.Description>
            </MessageComponent.Content>
            <MessageComponent.Buttons>
                <SubmitButton buttonStyle='outline' icon={<BookOpenIcon className="h-5 w-5 ml-2" />} isDisabled={false} isSubmitting={false} onClick={() => {
                    window.open('https://docs.layerswap.io/user-docs/why-is-coinbase-transfer-taking-so-long', '_blank')
                }}>
                    Learn More
                </SubmitButton>
                <GoHomeButton>
                    <SubmitButton buttonStyle='outline' isDisabled={false} isSubmitting={false} icon={<HomeIcon className="h-5 w-5 ml-2" aria-hidden="true" />}>
                        Go Home
                    </SubmitButton>
                </GoHomeButton>
            </MessageComponent.Buttons>
        </MessageComponent>
    )
}

export default ExchangeDelay;
