import sdk, {
    AmmpoolAPI,
    DelegateAPI,
    ExchangeAPI,
    GlobalAPI,
    NFTAPI,
    UserAPI,
    WalletAPI,
    contracts,
    WsAPI
} from "@loopring-web/loopring-sdk";
import * as lp from "@loopring-web/loopring-sdk";

export class LoopringAPI {
    public static userAPI: UserAPI;
    public static exchangeAPI: ExchangeAPI;
    public static ammpoolAPI: AmmpoolAPI;
    public static walletAPI: WalletAPI;
    public static wsAPI: WsAPI;
    public static nftAPI: NFTAPI;
    public static delegate: DelegateAPI;
    public static contractAPI: typeof contracts;
    public static globalAPI: GlobalAPI;
    public static __chainId__: sdk.ChainId;
    public static InitApi = (chainId: sdk.ChainId) => {
        LoopringAPI.userAPI = new UserAPI({ chainId });
        LoopringAPI.exchangeAPI = new ExchangeAPI({ chainId });
        LoopringAPI.globalAPI = new GlobalAPI({ chainId });
        LoopringAPI.ammpoolAPI = new AmmpoolAPI({ chainId });
        LoopringAPI.walletAPI = new WalletAPI({ chainId });
        LoopringAPI.wsAPI = new WsAPI({ chainId });
        LoopringAPI.nftAPI = new NFTAPI({ chainId });
        LoopringAPI.delegate = new DelegateAPI({ chainId });
        LoopringAPI.__chainId__ = chainId;
        LoopringAPI.contractAPI = contracts;
    };
}
LoopringAPI.InitApi(lp.ChainId.GOERLI); 