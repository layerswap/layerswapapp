import SubmitButton from "./buttons/submitButton";
import CardContainer from "./cardContainer";
import LayerSwapLogo from "./icons/layerSwapLogo";
import IntroCard from "./introCard";

function NoCookies(props) {
    return (
        <div className="flex items-stretch flex-col">
            <LayerSwapLogo className="block md:hidden h-8 w-auto text-white mt-5"></LayerSwapLogo>
            <CardContainer {...props} >
                <div className="flex flex-col justify-center space-y-12 p-8 md:p-20 text-white md:min-h-fit min-h-[400px]">
                    <p className="mb-4 text-primary-text">
                        We apologize for any inconvenience you may experience while using our website. We noticed that you have disabled all cookies in your browser, which may prevent our site from functioning as intended.
                    </p>
                    <span className="block xl:inline">
                        Cookies are small text files that are stored on your computer when you visit a website. They are commonly used to remember your preferences, personalize your experience, and track your activity on the site. Without cookies, some features of our website may not work correctly, and your browsing experience may be less efficient.
                    </span>
                </div>
            </CardContainer>
            <IntroCard />
        </div>
    );
}

export default NoCookies;
