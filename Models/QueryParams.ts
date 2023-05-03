///Doe to typechecking please always set default values in this class
export class QueryParams {
    from?: string = "";
    to?: string = "";
    lockAddress?: boolean = false;
    lockFrom?: boolean = false;
    lockTo?: boolean = false;
    destAddress?: string = "";
    addressSource?: string = "";
    coinbase_redirect?: string = "";
    asset?: string = "";
    amount?: string = "";
    externalId?: string = ""
    products?: string = "";
    selectedProduct?: string = "";
    signature?: string = "";
    timestamp?: string = "";
    apiKey?: string = "";

    // Obsolate
    sourceExchangeName?: string = "";
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    lockExchange?: boolean = false;
}