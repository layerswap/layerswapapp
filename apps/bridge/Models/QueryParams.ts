
export class PersistantQueryParams {
    from?: string = "";
    to?: string = "";
    fromExchange?: string = "";
    lockFrom?: boolean = false;
    lockTo?: boolean = false;

    lockFromAsset?: boolean = false;
    lockToAsset?: boolean = false;
    destination_address?: string = "";
    fromAsset?: string = "";
    toAsset?: string = "";
    hideRefuel?: boolean = false;
    hideAddress?: boolean = false;
    hideFrom?: boolean = false;
    hideTo?: boolean = false;
    amount?: string = "";
    externalId?: string = ""
    signature?: string = "";
    timestamp?: string = "";
    apiKey?: string = "";
    balances?: string = "";
    account?: string = "";
    actionButtonText?: string = "";
    theme?: string = "";
    appName?: string = "";
    depositMethod?: string = "";
    hideDepositMethod?: boolean = false;
    hideLogo?: boolean = false
    sameAccountNetwork?: string = "";
    clientId?: string = "";
    defaultTab?: string = "";

    // Obsolate
    sourceExchangeName?: string = "";
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    lockExchange?: boolean = false;
    addressSource?: string = "";
    asset?: string = "";
    lockAsset?: boolean = false;
    destAddress?: string = "";

}


export class QueryParams extends PersistantQueryParams {
    coinbase_redirect?: string = "";
}