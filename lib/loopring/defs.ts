import { EddsaKey } from "./utils";

export enum LOOPRING_URLs {
    GET_AVAILABLE_BROKER = "/api/v3/getAvailableBroker",
    GET_RELAYER_CURRENT_TIME = "/api/v3/timestamp",
    API_KEY_ACTION = "/api/v3/apiKey",
    GET_NEXT_STORAGE_ID = "/api/v3/storageId",
    ORDER_ACTION = "/api/v3/order",
    ORDER_CANCEL_HASH_LIST = "/api/v3/orders/byHash",
    ORDER_CANCEL_CLIENT_ORDER_ID_LIST = "/api/v3/orders/byClientOrderId",
    GET_MULTI_ORDERS = "/api/v3/orders",
    GET_MARKETS = "/api/v3/exchange/markets",
    GET_TOKENS = "/api/v3/exchange/tokens",
    GET_EXCHANGE_INFO = "/api/v3/exchange/info",
    GET_WITHDRAWAL_AGENTS = "/api/v3/exchange/withdrawalAgents",
    GET_EXCHANGE_FEEINFO = "/api/v3/exchange/feeInfo",
    GET_IGNORE_WITHDRAW = "/api/v3/exchange/notWithdrawContractTokens",
    GET_MIX_MARKETS = "/api/v3/mix/markets",
    GET_DEPTH = "/api/v3/depth",
    GET_MIX_DEPTH = "/api/v3/mix/depth",
    GET_TICKER = "/api/v3/ticker",
    GET_MIX_TICKER = "/api/v3/mix/ticker",
    GET_CANDLESTICK = "/api/v3/candlestick",
    GET_MIX_CANDLESTICK = "/api/v3/mix/candlestick",
    GET_FIAT_PRICE = "/api/v3/price",
    GET_TRADES = "/api/v3/trade",
    POST_INTERNAL_TRANSFER = "/api/v3/transfer",
    ACCOUNT_ACTION = "/api/v3/account",
    COUNTER_FACTUAL_INFO = "/api/v3/counterFactualInfo",
    GET_USER_REG_TXS = "/api/v3/user/createInfo",
    GET_PWD_RESET_TXS = "/api/v3/user/updateInfo",
    GET_USER_EXCHANGE_BALANCES = "/api/v3/user/balances",
    GET_USER_DEPOSITS_HISTORY = "/api/v3/user/deposits",
    WITHDRAWALS_ACTION = "/api/v3/user/withdrawals",
    POST_FORCE_WITHDRAWALS = "/api/v3/user/forceWithdrawals",
    GET_USER_TRANSFERS_LIST = "/api/v3/user/transfers",
    GET_USER_TRADE_HISTORY = "/api/v3/user/trades",
    GET_USER_TXS = "/api/v3/user/transactions",
    GET_USER_FEE_RATE = "/api/v3/user/feeRates",
    GET_USER_ORDER_FEE_RATE = "/api/v3/user/orderFee",
    GET_MINIMAL_ORDER_AMT = "/api/v3/user/orderAmount",
    GET_MINIMUM_TOKEN_AMT = "/api/v3/user/orderUserRateAmount",
    GET_OFFCHAIN_FEE_AMT = "/api/v3/user/offchainFee",
    GET_USER_BILLS = "/api/v3/user/bills",
    GET_ALLOWANCES = "/api/v3/eth/allowances",
    GET_ETH_NONCE = "/api/v3/eth/nonce",
    GET_ETH_BALANCES = "/api/v3/eth/balances",
    GET_TOKEN_BALANCES = "/api/v3/eth/tokenBalances",
    GET_AKK_TOKEN_BALANCES = "/api/v3/eth/tokenBalances/all",
    GET_GAS_PRICE = "/api/v3/eth/recommendedGasPrice",
    GET_GAS_PRICE_RANGE = "/api/v3/eth/recommendedGasPriceRange",
    GET_RECOMENDED_MARKETS = "/api/v3/exchange/recommended",
    GET_AMM_POOLS_CONF = "/api/v3/amm/pools",
    GET_AMM_POOLS_SNAPSHOT = "/api/v3/amm/balance",
    GET_AMM_POOLS_BALANCES = "/api/v3/amm/balances",
    GET_AMM_POOL_STATS = "/api/v3/amm/poolsStats",
    POST_JOIN_AMM_POOL = "/api/v3/amm/join",
    POST_EXIT_AMM_POOL = "/api/v3/amm/exit",
    GET_AMM_POOL_TXS = "/api/v3/amm/transactions",
    GET_USER_AMM_POOL_TXS = "/api/v3/amm/user/transactions",
    GET_AMM_POOL_TRADE_TXS = "/api/v3/amm/trades",
    GET_AMM_ACTIVITY_RULES = "/api/v3/sidecar/activityRules",
    GET_AMMPOOL_USER_REWARDS = "/api/v3/amm/user/rewards",
    GET_AMMPOOL_REWARDS = "/api/v3/amm/rewards",
    GET_AMMPOOL_GAME_RANK = "/api/v3/game/rank",
    GET_AMMPOOL_GAME_USER_RANK = "/api/v3/game/user/rank",
    GET_LIQUIDITY_MINING = "/api/v3/sidecar/liquidityMining",
    GET_DELEGATE_GET_CODE = "/api/v3/delegator/getCode",
    GET_DELEGATE_GET_IPFS = "/api/v3/delegator/ipfs",
    GET_LIQUIDITY_MINING_USER_HISTORY = "/api/v3/sidecar/liquidityMiningUserHistory",
    GET_PROTOCOL_PORTRAIT = "/api/v3/sidecar/ProtocolPortrait",
    GET_PROTOCOL_REWARDS = "/api/v3/sidecar/commissionReward",
    GET_AMM_ASSET_HISTORY = "/api/v3/amm/assets",
    GET_ASSET_LOCK_RECORDS = "api/v3/user/lockRecords",
    GET_DEFI_TOKENS = "/api/v3/defi/tokens",
    GET_DEFI_MARKETS = "/api/v3/defi/markets",
    POST_DEFI_ORDER = "/api/v3/defi/order",
    GET_DEFI_REWARDS = "/api/v3/defi/rewards",
    GET_DEFI_TRANSACTIONS = "/api/v3/defi/transactions",
    SET_REFERRER = "/api/v3/refer",
    GET_WS_KEY = "/v3/ws/key",
    GET_LATEST_TOKEN_PRICES = "/api/v3/datacenter/getLatestTokenPrices",
    GET_USER_TRADE_AMOUNT = "/api/v3/datacenter/getUserTradeAmount",
    GET_USER_ASSETS = "/api/wallet/v3/userAssets",
    GET_TOKEN_PRICES = "/api/wallet/v3/tokenPrices",
    GET_GUARDIAN_APPROVE_LIST = "/api/wallet/v3/getGuardianApproveList",
    GET_PROTECTORS = "/api/wallet/v3/getProtects",
    GET_OPERATION_LOGS = "/api/wallet/v3/operationLogs",
    GET_HEBAO_CONFIG = "/api/wallet/v3/getAppConfigs",
    GET_WALLET_TYPE = "/api/wallet/v3/wallet/type",
    GET_WALLET_MODULES = "/api/wallet/v3/walletModules",
    GET_WALLET_CONTRACTVERSION = "/api/wallet/v3/contractVersion",
    RESOLVE_ENS = "/api/wallet/v3/resolveEns",
    RESOLVE_NAME = "/api/wallet/v3/resolveName",
    SUBMIT_APPROVE_SIGNATURE = "/api/wallet/v3/submitApproveSignature",
    REJECT_APPROVE_SIGNATURE = "/api/wallet/v3/rejectApproveSignature",
    SEND_META_TX = "/api/wallet/v3/sendMetaTx",
    GET_ACCOUNT_SERVICES = "/api/v3/spi/getAccountServices",
    GET_USER_VIP_INFO = "/api/v3/user/vipInfo",
    GET_USER_VIP_ASSETS = "/api/v3/datacenter/getUserAssets",
    GET_USER_NFT_BALANCES = "/api/v3/user/nft/balances",
    GET_USER_NFT_BALANCES_BY_COLLECTION = "/api/v3/user/nft/collection/balances",
    GET_NFT_OFFCHAIN_FEE_AMT = "/api/v3/user/nft/offchainFee",
    POST_NFT_INTERNAL_TRANSFER = "/api/v3/nft/transfer",
    POST_NFT_WITHDRAWALS = "/api/v3/nft/withdrawal",
    POST_NFT_MINT = "/api/v3/nft/mint",
    POST_NFT_TRADE = "/api/v3/nft/trade",
    POST_NFT_VALIDATE_ORDER = "/api/v3/nft/validateOrder",
    POST_NFT_EDIT_COLLECTION = "/api/v3/nft/collection/edit",
    POST_NFT_CREATE_LEGACY_COLLECTION = "/api/v3/nft/collection/legacy/tokenAddress",
    POST_NFT_VALIDATE_REFRESH_NFT = "/api/v3/nft/image/refresh",
    POST_DEPLOY_COLLECTION = "/api/v3/collection/deployTokenAddress",
    POST_NFT_LEGACY_UPDATE_COLLECTION = "/api/v3/nft/collection/legacy/updateNftCollection",
    POST_NFT_UPDATE_NFT_GROUP = "/api/v3/user/nft/updateNftPreference",
    GET_NFT_COLLECTION = "/api/v3/nft/collection",
    POST_NFT_CREATE_COLLECTION = "/api/v3/nft/collection",
    DELETE_NFT_CREATE_COLLECTION = "/api/v3/nft/collection",
    GET_COLLECTION_WHOLE_NFTS = "/api/v3/nft/public/collection/items",
    GET_NFT_COLLECTION_PUBLISH = "/api/v3/nft/public/collection",
    GET_NFT_COLLECTION_HASNFT = "/api/v3/user/collection/details",
    GET_NFT_LEGACY_COLLECTION = "/api/v3/nft/collection/legacy",
    GET_NFT_LEGACY_TOKENADDRESS = "/api/v3/nft/collection/legacy/tokenAddress",
    GET_NFT_LEGACY_BALANCE = "/api/v3/nft/collection/legacy/balance",
    GET_NFTs_INFO = "/api/v3/nft/info/nfts",
    GET_USER_NFT_TRANSFER_HISTORY = "/api/v3/user/nft/transfers",
    GET_USER_NFT_DEPOSIT_HISTORY = "/api/v3/user/nft/deposits",
    GET_USER_NFT_WITHDRAW_HISTORY = "/api/v3/user/nft/withdrawals",
    GET_USER_NFT_TRANSACTION_HISTORY = "/api/v3/user/nft/transactions",
    GET_USER_NFT_TRADE_HISTORY_OLD = "/api/v3/user/nft/trades",
    GET_USER_NFT_TRADE_HISTORY = "/api/v3/new/user/nft/trades",
    GET_USER_NFT_MINT_HISTORY = "/api/v3/user/nft/mints",
    GET_DEPLOY_TOKEN_ADDRESS = "/api/v3/nft/deployTokenAddress",
    IPFS_META_URL = "https://ipfs.loopring.io/ipfs/",
    GET_DUAL_INDEX = "/api/v3/dual/index",
    GET_DUAL_PRICES = "/api/v3/dual/prices",
    GET_DUAL_INFOS = "/api/v3/dual/infos",
    GET_DUAL_TRANSACTIONS = "/api/v3/dual/transactions",
    GET_DUAL_BALANCE = "/api/v3/dual/balance",
    GET_DUAL_RULE = "/api/v3/dual/rules",
    POST_DUAL_ORDER = "/api/v3/dual/order",
    GET_DUAL_USER_LOCKED = "/api/v3/dual/lockRecordAmount",
    GET_LUCK_TOKEN_AGENTS = "/api/v3/luckyToken/agents",
    GET_LUCK_TOKEN_AUTHORIZEDSIGNERS = "/api/v3/luckyToken/authorizedSigners",
    GET_LUCK_TOKEN_CLAIMHISTORY = "/api/v3/luckyToken/user/claimHistory",
    GET_LUCK_TOKEN_LUCKYTOKENS = "/api/v3/luckyToken/user/luckyTokens",
    GET_LUCK_TOKEN_LUCKYTOKENDETAIL = "/api/v3/luckyToken/user/luckyTokenDetail",
    GET_LUCK_TOKEN_BLINDBOXDETAIL = "/api/v3/luckyToken/user/blindBoxDetail",
    GET_LUCK_TOKEN_WITHDRAWALS = "/api/v3/luckyToken/user/withdraws ",
    GET_LUCK_TOKEN_BALANCES = "/api/v3/luckyToken/user/balances",
    GET_LUCK_TOKEN_CLAIMEDLUCKYTOKENS = "/api/v3/luckyToken/user/claimedLuckyTokens",
    GET_LUCK_TOKEN_CLAIMEDBLINDBOX = "/api/v3/luckyToken/user/claimBlindBoxHistory",
    GET_LUCK_TOKEN_SUMMARY = "/api/v3/luckyToken/user/summary",
    POST_LUCK_TOKEN_SENDLUCKYTOKEN = "/api/v3/luckyToken/sendLuckyToken",
    POST_LUCK_TOKEN_CLAIMLUCKYTOKEN = "/api/v3/luckyToken/claimLuckyToken",
    POST_LUCK_TOKEN_CLAIMBLINDBOX = "/api/v3/luckyToken/claimBlindBox",
    POST_LUCK_TOKEN_WITHDRAWALS = "/api/v3/luckyToken/user/withdrawals",
    GET_BANXA_API_KEY = "/api/v3/hmacAuthentication",
    GET_STAKE_PRODUCTS = "/api/v3/stake/products",
    POST_STAKE_CLAIM = "/api/v3/stake/claim",
    POST_STAKE = "/api/v3/stake/stake",
    POST_STAKE_REDEEM = "/api/v3/stake/redeem",
    GET_STAKE_SUMMARY = "/api/v3/stake/user/summary",
    GET_STAKE_TRANSACTIONS = "/api/v3/stake/user/transactions",
    GET_CONTACTS = "/api/v3/user/contact",
    CREATE_CONTACT = "/api/v3/user/contact/add",
    UPDATE_CONTACT = "/api/v3/user/contact/update",
    DELETE_CONTACT = "/api/v3/user/contact",
    GET_CEFI_MARKETS = "api/v3/cefi/markets",
    GET_CEFI_DEPTH = "api/v3/cefi/depth",
    GET_CEFI_ORDERS = "api/v3/cefi/orders",
    POST_CEFI_ORDER = "api/v3/cefi/order"
}

export enum ChainId {
    MAINNET = 1,
    SEPOLIA = 11155111
}

export interface CounterFactualInfo {
    accountId: number;
    owner: string;
    walletFactory: string;
    walletSalt: string;
    walletOwner: string;
}

export interface AccountInfo {
    accountId: number;
    owner: string;
    frozen: boolean;
    publicKey: PublicKey;
    tags?: string;
    nonce: number;
    keyNonce: number;
    keySeed: string;
}
export interface UserBalanceInfo {
    tokenId: number;
    total: string;
    locked: string;
    pending: {
        withdraw: string;
        deposit: string;
    };
}
export enum OffchainFeeReqType {
    ORDER = 0,
    OFFCHAIN_WITHDRAWAL = 1,
    UPDATE_ACCOUNT = 2,
    TRANSFER = 3,
    FAST_OFFCHAIN_WITHDRAWAL = 4,
    OPEN_ACCOUNT = 5,
    AMM_EXIT = 6,
    DEPOSIT = 7,
    AMM_JOIN = 8,
    TRANSFER_AND_UPDATE_ACCOUNT = 15,
    DEFI_JOIN = 21,
    DEFI_EXIT = 22,
    FORCE_WITHDRAWAL = 23
}

export interface AccountInfo {
    accountId: number;
    owner: string;
    frozen: boolean;
    publicKey: PublicKey;
    tags?: string;
    nonce: number;
    keyNonce: number;
    keySeed: string;
}

export interface PublicKey {
    x: string;
    y: string
}

export const KEY_MESSAGE =
    'Sign this message to access Loopring Exchange: ' +
    '${exchangeAddress}' +
    ' with key nonce: ' +
    '${nonce}'

export interface AmmPoolInfoV3 {
    name: string;
    market: string;
    address: string;
    version: string;
    tokens: {
        pooled: string[];
        lp: number;
    };
    feeBips: number;
    precisions: {
        price: number;
        amount: number;
    };
    createdAt: string;
    status: number;
    domainSeparator: string;
}
export interface LoopringMap<T> {
    [key: string]: T;
}
export interface MarketInfo {
    baseTokenId: number;
    enabled: boolean;
    market: string;
    orderbookAggLevels: number;
    precisionForPrice: number;
    quoteTokenId: number;
    status?: MarketStatus;
    isSwapEnabled?: boolean;
    createdAt?: number;
}
export declare enum MarketStatus {
    AMM = 1,
    ORDER_BOOK = 2,
    ALL = 3
}
export declare const SEP = ",";
export declare const SoursURL = "https://static.loopring.io/assets/";
export declare type TokenAddress = string;
export interface TokenInfo {
    type: string;
    tokenId: number;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    precision: number;
    precisionForOrder: number;
    orderAmounts: {
        minimum: string;
        maximum: string;
        dust: string;
    };
    luckyTokenAmounts: {
        minimum: string;
        maximum: string;
        dust: string;
    };
    fastWithdrawLimit: string;
    gasAmounts: {
        distribution: string;
        deposit: string;
    };
    enabled: boolean;
    isLpToken: boolean;
}
export declare type TOKENMAPLIST = {
    tokensMap: LoopringMap<TokenInfo>;
    coinMap: LoopringMap<{
        icon?: string;
        name: string;
        simpleName: string;
        description?: string;
        company: string;
    }>;
    totalCoinMap: LoopringMap<{
        icon?: string;
        name: string;
        simpleName: string;
        description?: string;
        company: string;
    }>;
    idIndex: LoopringMap<string>;
    addressIndex: LoopringMap<TokenAddress>;
};
export interface TokenRelatedInfo {
    tokenId: string;
    tokenList: string[];
}
export interface DefiMarketInfo {
    type: string;
    market: string;
    apy: string;
    baseTokenId: number;
    quoteTokenId: number;
    precisionForPrice: number;
    orderbookAggLevels: number;
    enabled: boolean;
    currency: string;
    status: DefiMarketStatus;
    accountId: number;
    address: string;
    depositFeeBips: number;
    withdrawFeeBips: number;
    depositPrice: string;
    withdrawPrice: string;
    baseVolume: string;
    quoteVolume: string;
    quoteLimitAmount: string;
    baseLimitAmount: string;
    quoteAlias: string;
}
export declare enum DefiMarketStatus {
    hide = 0,
    show = 1,
    depositOnly = 3,
    depositAll = 7,
    withdrawOnly = 9,
    depositAllAndWithdraw = 15,
    withdrawAll = 25,
    WithdrawAllAndDeposit = 27,
    depositAndWithdraw = 11,
    all = 31
}


export interface PublicKey {
    x: string;
    y: string;
}

export interface TokenVolumeV3 {
    tokenId: string | number;
    volume: string;
}
export interface UpdateAccountRequestV3 {
    exchange: string;
    owner: string;
    accountId: number;
    publicKey: {
        x: string;
        y: string;
    };
    maxFee: {
        tokenId: string | number;
        volume: string;
    };
    validUntil: number;
    nonce: number;
    eddsaSignature?: string;
    ecdsaSignature?: string;
    hashApproved?: string;
    keySeed?: string;
}


export type UnlockedAccount = {
    eddsaKey: EddsaKey
    apiKey: string
}


export interface OriginTransferRequestV3 {
    exchange: string;
    payerId: number;
    payerAddr: string;
    payeeId: number;
    payeeAddr: string;
    token: TokenVolumeV3;
    maxFee: TokenVolumeV3;
    storageId: number;
    validUntil: number;
    eddsaSignature?: string;
    ecdsaSignature?: string;
    hashApproved?: string;
    memo?: string;
    clientId?: string;
    payPayeeUpdateAccount?: boolean;
}

export type LpFee = {
    fees: {
        token: string,
        tokenId: number,
        fee: string,
        discount: number
    }[],
    gasPrice: string
}

export interface ExchangeInfo {
    ammExitFees: Array<any>[];
    chainId: number;
    depositAddress: string;
    exchangeAddress: string;
    fastWithdrawalFees: Array<any>[];
    onchainFees: Array<any>[];
    openAccountFees: Array<any>[];
    transferFees: Array<any>[];
    updateFees: Array<any>[];
    withdrawalFees: Array<any>[];
}

