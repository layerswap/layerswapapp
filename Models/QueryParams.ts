
export class PersistantQueryParams {
    from?: string = "";
    to?: string = "";
    lockAddress?: boolean = false;
    lockFrom?: boolean = false;
    lockTo?: boolean = false;
    lockAsset?: boolean = false;
    destAddress?: string = "";
    addressSource?: string = "";
    hideRefuel?: boolean = false;
    hideAddress?: boolean = false;
    hideFrom?: boolean = false;
    hideTo?: boolean = false;
    asset?: string = "";
    amount?: string = "";
    externalId?: string = ""
    signature?: string = "";
    timestamp?: string = "";
    apiKey?: string = "";
    balances?: string = null;
    account?: string = "";
    actionButtonText?: string = "";
    theme?: string = "";

    // Obsolate
    sourceExchangeName?: string = "";
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    lockExchange?: boolean = false;
}


export class QueryParams extends  PersistantQueryParams {
    coinbase_redirect?: string = "";
}