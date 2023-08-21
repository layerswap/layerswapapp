import CardContainer from './cardContainer';
import { ChevronRight } from 'lucide-react';
import FooterComponent from './footerComponent';

function IntroCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col px-6 py-6 text-secondary-text font-light">
                <div>
                    <h1 className="text-xl font-light text-primary-text">About Layerswap</h1>
                    <p className="text-base mt-2">
                        Move crypto across exchanges, blockchains, and wallets. <a className='underline hover:no-underline cursor-pointer plausible-event-name=Read+more' href='https://docs.layerswap.io/user-docs/' target='_blank'>Read more</a>
                    </p>
                    <a target="_blank" href="https://twitter.com/layerswap/status/1681324777795985408" className="mt-3 inline-flex group items-center rounded-lg border border-secondary-500  bg-secondary-600 p-1 pr-2 text-primary-text sm:text-base lg:text-sm xl:text-base">
                        <span className="rounded-md bg-primary px-3 py-0.5 text-sm font-semibold leading-5 text-primary-text"> New </span>
                        <span className="ml-2 md:text-sm text-xs font-medium flex items-center gap-2">Linea Mainnet is live on Layerswap </span>
                        <ChevronRight className="ml-2 h-5 w-5 text-secondary-text group-hover:text-primary-500" aria-hidden="true" />
                    </a>
                </div>
                <FooterComponent />
            </div>
        </CardContainer>
    );
}

export default IntroCard;