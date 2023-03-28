import CardContainer from './cardContainer';
import { ChevronRight, Package } from 'lucide-react';
import FooterComponent from './footerComponent';

function CampaignCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col gap-5 px-4 md:px-8 py-6 text-primary-text font-light">
                <div>
                    <h1 className="text-xl font-medium text-white">$OP Rewards</h1>
                    <p className="text-base mt-2">
                        Earn OP tokens every time you swap on Optimism
                    </p>
                </div>
                <button className='w-full py-3 rounded-md bg-[#cd031b] text-white flex justify-center gap-1 items-center font-semibold'>
                    <Package className='h-4 w-4' />
                    <span>View Details</span>
                </button>
            </div>
        </CardContainer>
    );
}

export default CampaignCard;
