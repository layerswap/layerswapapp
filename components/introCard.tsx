import CardContainer from './cardContainer';
import { ChevronRightIcon } from '@heroicons/react/solid';
import FooterComponent from './footerComponent';
import { useState } from 'react';
import Modal from './modalComponent';
import { DocIframe } from './docInIframe';
import logsnag from './utils/LogSnag';

function IntroCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col px-4 md:px-8 py-6 text-primary-text font-light">
                <div>
                    <h1 className="text-xl font-light text-white">About Layerswap</h1>
                    <p className="text-base mt-2">
                        Move crypto across exchanges, blockchains, and wallets. <a onClick={() => logsnag.publish({ channel: 'all', event: 'Clicked on "Read More"' })} className='underline hover:no-underline cursor-pointer plausible-event-name=Read+more' href='https://docs.layerswap.io/user-docs/' target='_blank'>Read more</a>
                    </p>
                    <a target="_blank" href="https://twitter.com/layerswap/status/1635399138316627969" className="mt-3 inline-flex group items-center rounded-lg border border-darkblue-400  bg-darkblue-600 p-1 pr-2 text-white sm:text-base lg:text-sm xl:text-base">
                        <span className="rounded-md bg-primary px-3 py-0.5 text-sm font-semibold leading-5 text-white"> New </span>
                        <span className="ml-4 md:text-sm text-xs font-medium">Integration with Solana 🚀</span>
                        <ChevronRightIcon className="ml-2 h-5 w-5 text-primary-text group-hover:text-primary-500" aria-hidden="true" />
                    </a>
                </div>
                <FooterComponent />
            </div>
        </CardContainer>
    );
}

export default IntroCard;
