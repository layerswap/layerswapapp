import { NetworkCurrency } from "./CryptoNetwork";
import { LayerStatus } from "./Layer";

export class Exchange {
    display_name: string;
    internal_name: string;
    is_featured: boolean;
    status: LayerStatus;
    type: string;
    created_date: string;
    metadata: ExchangeMetadata | null | undefined;
    img_url?: string
}

export type ExchangeMetadata = {}