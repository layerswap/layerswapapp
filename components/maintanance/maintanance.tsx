import SubmitButton from "../buttons/submitButton";
import CardContainer from "../cardContainer";
import LayerSwapLogo from "../icons/layerSwapLogo";
import TwitterLogo from "../icons/TwitterLogo";

function MaintananceContent(props) {
    const twitterLogo = <TwitterLogo className="text-white h-6 w-6" />
    return (
        <div className="flex items-stretch flex-col">
            <LayerSwapLogo className="block md:hidden h-8 w-auto text-white mt-5"></LayerSwapLogo>
            <CardContainer {...props} >
                <div className="flex flex-col justify-center space-y-12 p-8 md:p-20 text-white md:min-h-fit min-h-[400px]">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-200 md:text-5xl">
                        <span className="block xl:inline">We'll be back</span>{' '}
                        <span className="block text-pink-primary xl:inline">after the Merge</span>
                    </h1>
                    <SubmitButton onClick={() => window.open('https://twitter.com/layerswap', '_blank')} icon={twitterLogo} isDisabled={false} isSubmitting={false}>Follow for updates</SubmitButton>
                </div>
            </CardContainer>
        </div>
    );
}

export default MaintananceContent;
