import { FC } from "react"
// import TonConnectProvider from "./TonConnectProvider"
// import SolanaProvider from "./SolanaProvider"
import Wagmi from "./Wagmi";
// import StarknetProvider from "./StarknetProvider";
// import { ImtblPassportProvider } from "./ImtblPassportProvider";
// import TronProvider from "./TronProvider";
import { ThemeData } from "../../../Models/Theme";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], themeData: ThemeData }> = ({ children, themeData }) => {
    return (
        // <TonConnectProvider themeData={themeData}>
            // <SolanaProvider>
                // <TronProvider>
                    // <StarknetProvider>
                        <Wagmi>
                            {/* <ImtblPassportProvider> */}
                                {children}
                            {/* </ImtblPassportProvider> */}
                        </Wagmi>
                    // </StarknetProvider>
                // </TronProvider>
            // </SolanaProvider>
        // </TonConnectProvider>
    )
}

export default WalletsProviders