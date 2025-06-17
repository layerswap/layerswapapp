import { SwapFormValues } from '../DTOs/SwapFormValues';
import { DetailedEstimates } from './DetailedEstimates';
import { useQuote } from '../../context/feeContext';
import FeeDetails from './FeeDetailsComponent';
import { useQueryState } from '../../context/query';
import ResizablePanel from '../ResizablePanel';
import { FC, useState } from 'react';
import dynamic from 'next/dynamic';
import DepositMethod from './DepositMethod';
import Campaign from './Campaign';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown, Clock } from 'lucide-react';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import AverageCompletionTime from '../Common/AverageCompletionTime';

const RefuelModal = dynamic(() => import("./RefuelModal"), {
    loading: () => <></>,
});

const RefuelToggle = dynamic(() => import("./Refuel"), {
    loading: () => <></>,
});

export default function QuoteDetails({ values }: { values: SwapFormValues }) {
    const { toAsset: toCurrency, to, toExchange, from, fromAsset: fromCurrency, amount, destination_address } = values || {};
    const { quote, isQuoteLoading } = useQuote()
    const query = useQueryState();
    const [openRefuelModal, setOpenRefuelModal] = useState<boolean>(false)
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);


    return (
        <>
            {
                from && to && toCurrency && fromCurrency &&
                <DepositMethod />
            }
            {
                (quote || (!quote && isQuoteLoading)) &&
                <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
                    <AccordionItem value='quote' className='bg-secondary-500 rounded-xl'>
                        <AccordionTrigger className={clsx(
                            'p-4 w-full rounded-xl flex items-center justify-between transition-colors duration-200',
                            {
                                'bg-secondary-500': !isAccordionOpen,
                                'bg-secondary-400': isAccordionOpen,
                            }
                        )}>
                            {
                                (isAccordionOpen) ?
                                    <p>
                                        Details
                                    </p>
                                    :
                                    <DetailsButton quote={quote} isQuoteLoading={isQuoteLoading} />
                            }
                            <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
                        </AccordionTrigger>
                        <AccordionContent>
                            <div>
                                <ResizablePanel>
                                    <FeeDetails>
                                        {
                                            toCurrency?.refuel && !query.hideRefuel && !toExchange &&
                                            <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                                        }
                                        {
                                            (quote || isQuoteLoading) && fromCurrency && toCurrency &&
                                            <FeeDetails.Item>
                                                <DetailedEstimates />
                                            </FeeDetails.Item>
                                        }
                                        {
                                            values.to &&
                                            values.toAsset &&
                                            destination_address &&
                                            <Campaign
                                                destination={values.to}
                                                reward={quote?.reward}
                                                destinationAddress={destination_address}
                                            />
                                        }

                                    </FeeDetails>
                                </ResizablePanel>

                                <RefuelModal openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}


const DetailsButton: FC<{ quote?: Quote, isQuoteLoading: boolean }> = ({ quote: quoteData, isQuoteLoading }) => {

    const feeAmountInUsd = quoteData?.quote.total_fee_in_usd
    const displayFeeInUsd = feeAmountInUsd ? (feeAmountInUsd < 0.01 ? '<$0.01' : `$${feeAmountInUsd?.toFixed(2)}`) : null

    const averageCompletionTime = quoteData?.quote.avg_completion_time;

    if (isQuoteLoading) {
        return (
            <div className='h-[24px] w-30 inline-flex bg-gray-500 rounded-xs animate-pulse' />
        )
    }

    return (
        <div className='divide-x divide-secondary-text flex items-center space-x-4'>
            {
                displayFeeInUsd &&
                <div className='inline-flex items-center gap-1 pr-4'>
                    <FeeIcon />
                    <p>
                        {displayFeeInUsd}
                    </p>
                </div>
            }
            {
                averageCompletionTime &&
                <div className="text-right text-primary-text inline-flex items-center gap-1 pr-4">
                    <Clock className='h-4 w-4' />
                    <AverageCompletionTime avgCompletionTime={quoteData.quote.avg_completion_time} />
                </div>
            }
        </div>
    )
}

const FeeIcon = () => {
    return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="17" viewBox="0 0 12 17" fill="none">
        <path d="M2.87876 15.6938L1.62112 16.9503C1.55419 17.0172 1.44573 17.0172 1.3788 16.9503L0.0502643 15.623C0.0180822 15.5908 0 15.5472 0 15.5017V1.49862C0 1.45313 0.0180822 1.4095 0.0502643 1.37735L1.3788 0.0500314C1.44573 -0.0168398 1.55419 -0.0168399 1.62112 0.0500314L2.87876 1.30652C2.94569 1.37339 3.05414 1.37339 3.12108 1.30652L4.37872 0.0500314C4.44565 -0.0168398 4.5541 -0.0168399 4.62103 0.0500314L5.87867 1.30652C5.94561 1.37339 6.05406 1.37339 6.12099 1.30652L7.37863 0.0500314C7.44556 -0.0168398 7.55402 -0.0168399 7.62095 0.0500314L8.87859 1.30652C8.94552 1.37339 9.05398 1.37339 9.12091 1.30652L10.3785 0.0500314C10.4455 -0.0168398 10.5539 -0.0168399 10.6209 0.0500314L11.9494 1.37735C11.9816 1.4095 11.9997 1.45313 11.9997 1.49862V15.5017C11.9997 15.5472 11.9816 15.5908 11.9494 15.623L10.6209 16.9503C10.5539 17.0172 10.4455 17.0172 10.3785 16.9503L9.12091 15.6938C9.05398 15.627 8.94552 15.627 8.87859 15.6938L7.62095 16.9503C7.55402 17.0172 7.44556 17.0172 7.37863 16.9503L6.12099 15.6938C6.05406 15.627 5.94561 15.627 5.87867 15.6938L4.62103 16.9503C4.5541 17.0172 4.44565 17.0172 4.37872 16.9503L3.12108 15.6938C3.05414 15.627 2.94569 15.627 2.87876 15.6938Z" fill="#A3ADC2" />
        <path d="M5.55467 13.9999V12.9891C5.13727 12.9428 4.74633 12.8272 4.38183 12.6422C4.02322 12.4506 3.72928 12.2293 3.5 11.9783L3.9321 9.99627C4.13786 10.3993 4.42887 10.7362 4.80511 11.0071C5.18136 11.2713 5.56643 11.4035 5.96032 11.4035C6.28366 11.4035 6.53645 11.3044 6.71869 11.1062C6.90682 10.908 7.00088 10.6668 7.00088 10.3828C7.00088 10.1515 6.95091 9.95994 6.85097 9.80799C6.75691 9.65603 6.64227 9.53051 6.50705 9.43141C6.37772 9.33231 6.26308 9.25633 6.16314 9.20348L5.22839 8.67826C4.95797 8.5263 4.69929 8.34793 4.45238 8.14312C4.20547 7.93171 4.00265 7.67075 3.84392 7.36024C3.69106 7.04973 3.61464 6.66654 3.61464 6.21069C3.61464 5.55663 3.78807 5.00829 4.13492 4.56564C4.48178 4.123 4.95503 3.84883 5.55467 3.74312V2.99988H6.50705V3.7233C6.87742 3.76955 7.20958 3.86865 7.50353 4.0206C7.79747 4.16594 8.04145 4.3212 8.23545 4.48636L7.82981 6.4188C7.59465 6.07525 7.31246 5.80108 6.98324 5.59627C6.65991 5.38486 6.33657 5.27916 6.01323 5.27916C5.72516 5.27916 5.50176 5.36174 5.34303 5.5269C5.19018 5.69207 5.11376 5.89687 5.11376 6.14132C5.11376 6.29327 5.14315 6.42871 5.20194 6.54763C5.26661 6.66654 5.35773 6.77225 5.47531 6.86474C5.59289 6.95724 5.73104 7.04973 5.88977 7.14222L6.83333 7.66745C6.99206 7.75333 7.16549 7.86564 7.35362 8.00438C7.54174 8.13651 7.72399 8.30498 7.90035 8.50979C8.07672 8.71459 8.22075 8.96234 8.33245 9.25303C8.44415 9.53712 8.5 9.87736 8.5 10.2738C8.5 10.941 8.32363 11.5224 7.9709 12.0179C7.61817 12.5068 7.13022 12.8173 6.50705 12.9494V13.9999H5.55467Z" fill="#545454" />
    </svg>
}