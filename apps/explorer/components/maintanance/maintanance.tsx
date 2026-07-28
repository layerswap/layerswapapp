import LayerswapExplorerLogo from "../icons/layerswapExplorer";
import CardContainer from "../cardContainer";

function MaintananceContent(props: any) {

    return (
        <div className="flex items-stretch flex-col">
            <LayerswapExplorerLogo className="block md:hidden h-8 w-auto text-primary-text mt-5"></LayerswapExplorerLogo>
            <CardContainer {...props} >
                <div className="flex flex-col justify-center space-y-12 p-10 text-primary-text md:min-h-fit min-h-[400px]">
                    <h1 className="text-xl tracking-tight text-gray-200">
                        <p className="mb-4 text-primary-text">
                            We&apos;re upgrading our systems and infrastructure to give you the best experience yet.
                        </p>
                        <span className="block font-bold text-3xl xl:inline">We&apos;ll be back at 15:00 UTC</span>
                        <p className="mt-4 text-primary-text">
                            Any pending swaps will be completed after maintenance.
                        </p>
                    </h1>
                </div>
            </CardContainer>
        </div>
    );
}

export default MaintananceContent;
