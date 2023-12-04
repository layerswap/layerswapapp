
export class PersistantQueryParams {
    from?: string = "";
    to?: string = "";
    lockAddress?: boolean = false;
    lockFrom?: boolean = false;
    lockTo?: boolean = false;
    lockAsset?: boolean = false;
    fromAsset?: string = "";
    toAsset?: string = "";
    destAddress?: string = "";
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

    // Obsolate
    sourceExchangeName?: string = "";
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    lockExchange?: boolean = false;
    addressSource?: string = "";
    asset?: string = "";

}


export class QueryParams extends PersistantQueryParams {
    coinbase_redirect?: string = "";
}