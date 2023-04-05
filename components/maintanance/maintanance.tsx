import SubmitButton from "../buttons/submitButton";
import CardContainer from "../cardContainer";
import LayerSwapLogo from "../icons/layerSwapLogo";
import TwitterLogo from "../icons/TwitterLogo";
import IntroCard from "../introCard";

function MaintananceContent(props) {
    const twitterLogo = <TwitterLogo className="text-white h-6 w-6" />
    return (
        <div className="flex items-stretch flex-col">
            <LayerSwapLogo className="block md:hidden h-8 w-auto text-white mt-5"></LayerSwapLogo>
            <CardContainer {...props} >
                <div className="flex flex-col justify-center space-y-12 p-8 md:p-20 text-white md:min-h-fit min-h-[400px]">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-200">
                        <p className="mb-4 text-primary-text">
                            We're upgrading our systems and infrastructure to give you the best experience yet.
                        </p>
                        <span className="block xl:inline">We'll be back</span>{' '}
                        <span className="block text-primary xl:inline">in 2 hours <span className="block xl:inline text-xl">(17:00 UTC)</span></span>
                    </h1>
                    <SubmitButton onClick={() => window.open('https://twitter.com/layerswap', '_blank')} icon={twitterLogo} isDisabled={false} isSubmitting={false}>Follow for updates</SubmitButton>
                </div>
            </CardContainer>
            <IntroCard />
        </div>
    );
}

export default MaintananceContent;
