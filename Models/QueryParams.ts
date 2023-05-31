///Doe to typechecking please always set default values in this class
export class QueryParams {
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
    hideTo?: boolean = false;
    coinbase_redirect?: string = "";
    asset?: string = "";
    amount?: string = "";
    externalId?: string = ""
    signature?: string = "";
    timestamp?: string = "";
    apiKey?: string = "";

    // Obsolate
    sourceExchangeName?: string = "";
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    lockExchange?: boolean = false;
}