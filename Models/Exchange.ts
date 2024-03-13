export class Exchange {
    display_name: string;
    name: string;
    logo: string;
    token_groups: {
        symbol: string;
        logo: string
    }[]
    metadata: {
        o_auth: {
            connect_url: string,
            authorize_url: string
        } | null
        listing_date: string
    }
}